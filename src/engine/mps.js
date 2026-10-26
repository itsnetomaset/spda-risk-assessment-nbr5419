/*
 * Surge protection measures orchestration (ABNT NBR 5419-4:2026): evaluates an
 * SPD point (Annex C) and a magnetic field / induced voltage evaluation
 * (Annex A) from the data entered in the MPS module.
 */
import { NEMAX_CALC_P3 } from "./nbr5419-3.js";
import { NEMAX_CALC_P4 } from "./nbr5419-4.js";
import { NEMAX_CALC_P4_CAMPO } from "./nbr5419-4-anexo-a.js";

/* Calcula tudo para um ponto de DPS — usado tanto na pré-visualização quanto
   na verificação final / memorial. Retorna null se dados insuficientes. */
export function calcularPontoDPS(p) {
  const up = parseFloat(p.up);
  if (isNaN(up)) return null;

  let uw;
  if (p.uwManual !== "" && p.uwManual !== undefined && p.uwManual !== null && !isNaN(parseFloat(p.uwManual))) {
    uw = parseFloat(p.uwManual);
  } else {
    const rUw = NEMAX_CALC_P4.tabelaA1_uw(p.faixaFaseTensao, p.categoriaProduto);
    if (!rUw) return null;
    uw = rUw.value;
  }

  let deltaU;
  if (p.deltaUModo === "manual") {
    const dm = parseFloat(p.deltaUManual);
    if (isNaN(dm)) return null;
    deltaU = { value: dm, formula: "ΔU informado manualmente", norma: "Dado de fabricante/projeto", substituicao: `ΔU = ${dm} kV (informado pelo usuário)` };
  } else {
    const ik = parseFloat(p.deltaUCorrenteKA);
    const lm = parseFloat(p.deltaUComprimentoM);
    if (isNaN(ik) || isNaN(lm)) return null;
    deltaU = NEMAX_CALC_P4.calc_deltaU_estimado(ik, lm);
  }

  const upF = p.tipoDPS === "comutador"
    ? NEMAX_CALC_P4.calc_UpEfetivo_comutador(up, deltaU.value)
    : NEMAX_CALC_P4.calc_UpEfetivo_limitador(up, deltaU.value);

  const compCircuito = p.comprimentoCircuitoM === "" || p.comprimentoCircuitoM === undefined ? 0 : parseFloat(p.comprimentoCircuitoM);
  const protecao = NEMAX_CALC_P4.verificarCondicaoProtecao(upF.value, uw, compCircuito, !!p.sistemaCritico);
  const aviso2x = NEMAX_CALC_P4.avisoOscilacaoCircuitoLongo(upF.value, uw);

  return { up, uw, deltaU, upF, protecao, aviso2x };
}

/* ============================================================
   calcularAvaliacaoCampo — orquestra NEMAX_CALC_P4_CAMPO conforme o
   cenário escolhido (impacto direto / próximo), reaproveitando kc do
   Módulo 8 (Parte 3, NEMAX_CALC_P3.resolverKc) e o raio da esfera rolante
   já tabelado por NP (NEMAX_CALC_P3.tabelas.TABELA2_NP), conforme acordado
   com o usuário, em vez de pedir esses dados novamente.
   ============================================================ */
function npAtualParaCampo(a) {
  return a.protecoes ? a.protecoes.npSpda : "nenhum";
}

export function calcularAvaliacaoCampo(a, c) {
  const NP = npAtualParaCampo(a);
  if (NP === "nenhum") return null;

  const wm = parseFloat(c.wm);
  if (isNaN(wm) || wm <= 0) return null;

  // --- Fator de blindagem SF (Tabela A.4) ---
  let SF;
  if (c.materialBlindagem === "aco") {
    const rc = parseFloat(c.rc);
    if (c.freq25kHz && (isNaN(rc) || rc <= 0)) return null;
    SF = NEMAX_CALC_P4_CAMPO.calc_SF_planaAco(wm, rc, !!c.freq25kHz, !!c.malhaEquipotencial);
  } else {
    SF = NEMAX_CALC_P4_CAMPO.calc_SF_planaCobreAluminio(wm, !!c.malhaEquipotencial);
  }

  const kh = c.kh === "" || c.kh === undefined ? 0.01 : parseFloat(c.kh);
  if (isNaN(kh)) return null;

  let H1_F, H1_FN, H1_S, ds, H0_F, H0_FN, H0_S, sa;

  if (c.cenario === "direto") {
    const dw = parseFloat(c.dw), dr = parseFloat(c.dr);
    if (isNaN(dw) || isNaN(dr) || dw <= 0 || dr <= 0) return null;
    H1_F = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "F", wm, dw, dr, kh);
    H1_FN = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "FN", wm, dw, dr, kh);
    H1_S = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "S", wm, dw, dr, kh);
    if (!H1_F || !H1_FN || !H1_S) return null;
    ds = NEMAX_CALC_P4_CAMPO.calc_ds1(SF.value, wm);
  } else {
    // cenário "proximo"
    let Sa_val;
    if (c.Sa !== "" && c.Sa !== undefined && !isNaN(parseFloat(c.Sa))) {
      Sa_val = parseFloat(c.Sa);
      sa = { value: Sa_val, formula: "Sa informado manualmente", norma: "Dado de projeto/levantamento", substituicao: `Sa = ${Sa_val} m (informado pelo usuário)` };
    } else {
      const H = parseFloat(c.alturaEstrutura), L = parseFloat(c.comprimentoEstrutura);
      if (isNaN(H) || isNaN(L)) return null;
      // Reaproveita o raio da esfera rolante já tabelado por NP (Parte 3 /
      // Tabela 4 da Parte 1) quando o campo não foi preenchido manualmente.
      let r;
      if (c.raioEsferaRolante !== "" && c.raioEsferaRolante !== undefined && !isNaN(parseFloat(c.raioEsferaRolante))) {
        r = parseFloat(c.raioEsferaRolante);
      } else {
        const npNorm = NEMAX_CALC_P4_CAMPO.normalizarNP(NP);
        const npParaTabela2 = npNorm === "III-IV" ? (NP === "IV" ? "IV" : "III") : NP;
        const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[npParaTabela2];
        if (!tab2) return null;
        r = tab2.raioEsfera;
      }
      sa = NEMAX_CALC_P4_CAMPO.calc_sa(r, H, L);
      Sa_val = sa.value;
    }
    H0_F = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "F", Sa_val);
    H0_FN = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "FN", Sa_val);
    H0_S = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "S", Sa_val);
    if (!H0_F || !H0_FN || !H0_S) return null;
    H1_F = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_F.value, SF.value);
    H1_FN = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_FN.value, SF.value);
    H1_S = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_S.value, SF.value);
    ds = NEMAX_CALC_P4_CAMPO.calc_ds2(SF.value, wm);
  }

  const resultado = { NP, SF, kh, H1_F, H1_FN, H1_S, ds, H0_F, H0_FN, H0_S, sa, cenario: c.cenario };

  // --- kc reaproveitado do Módulo 8, se disponível (informativo — não
  // entra diretamente nas equações de H1/H0, mas é exibido como contexto
  // técnico relevante para o projeto físico já dimensionado) ---
  if (a.dimensionamento) {
    const rKc = NEMAX_CALC_P3.resolverKc(a.dimensionamento);
    if (rKc) resultado.kcReaproveitado = rKc;
  }

  // --- Tensão/corrente induzida (Anexo A.5), se solicitado ---
  if (c.calcularInducao) {
    const l = parseFloat(c.lacoL), b = parseFloat(c.lacoB), rcLaco = parseFloat(c.lacoRc) || 0.005;
    if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
      const LS = NEMAX_CALC_P4_CAMPO.calc_LS_laco(l, b, rcLaco);
      resultado.LS = LS;
      if (c.cenario === "direto") {
        const dlw = parseFloat(c.dlw), dlr = parseFloat(c.dlr);
        if (!isNaN(dlw) && !isNaN(dlr) && dlw > 0 && dlr > 0) {
          const p = NEMAX_CALC_P4_CAMPO.parametrosNP(NP);
          resultado.UOC_F = NEMAX_CALC_P4_CAMPO.calc_UOC_max_F(b, l, dlw, dlr, wm, p.IF_MAX);
          resultado.ISC_F = NEMAX_CALC_P4_CAMPO.calc_ISC_max_F(b, l, dlw, dlr, wm, p.IF_MAX, LS.value);
          resultado.UOC_FN = NEMAX_CALC_P4_CAMPO.calc_UOC_max_FN(b, l, dlw, dlr, wm, p.IFN_MAX);
          resultado.ISC_FN = NEMAX_CALC_P4_CAMPO.calc_ISC_max_FN(b, l, dlw, dlr, wm, p.IFN_MAX, LS.value);
          resultado.UOC_S = NEMAX_CALC_P4_CAMPO.calc_UOC_max_S(b, l, dlw, dlr, wm, p.IS_MAX);
          resultado.ISC_S = NEMAX_CALC_P4_CAMPO.calc_ISC_max_S(b, l, dlw, dlr, wm, p.IS_MAX, LS.value);
        }
      } else {
        resultado.UOC_F = NEMAX_CALC_P4_CAMPO.calc_UOC_max_F_homogeneo(b, l, H1_F.value);
        resultado.ISC_F = NEMAX_CALC_P4_CAMPO.calc_ISC_max_F_homogeneo(b, l, H1_F.value, LS.value);
        resultado.UOC_FN = NEMAX_CALC_P4_CAMPO.calc_UOC_max_FN_homogeneo(b, l, H1_FN.value);
        resultado.ISC_FN = NEMAX_CALC_P4_CAMPO.calc_ISC_max_FN_homogeneo(b, l, H1_FN.value, LS.value);
        resultado.UOC_S = NEMAX_CALC_P4_CAMPO.calc_UOC_max_S_homogeneo(b, l, H1_S.value);
        resultado.ISC_S = NEMAX_CALC_P4_CAMPO.calc_ISC_max_S_homogeneo(b, l, H1_S.value, LS.value);
      }
    }
  }

  return resultado;
}
