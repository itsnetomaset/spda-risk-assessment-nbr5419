/*
 * Risk analysis orchestration (ABNT NBR 5419-2:2026): reads an analysis state
 * (the object the wizard saves) and runs the Part 2 and Annex D engines,
 * building the calculation memory shown in the app and in the report.
 */
import { NEMAX_CALC } from "./nbr5419-2.js";
import { NEMAX_CALC_R4 } from "./nbr5419-2-anexo-d.js";

function nowISO() {
  return new Date().toISOString();
}

/* ============================================================
   ORQUESTRAÇÃO DE CÁLCULO — conecta os dados coletados ao
   motor de fórmulas (NEMAX_CALC) e monta a memória de cálculo
   ============================================================ */

export const Calculo = (function () {
  function lookupPB(npSpda) {
    const map = { nenhum: 1, IV: 0.2, III: 0.1, II: 0.05, I: 0.02 };
    return map[npSpda] !== undefined ? map[npSpda] : 1;
  }
  function lookupPSPD(npDPS) {
    const map = { nenhum: 1, "III-IV": 0.05, II: 0.02, I: 0.01 };
    return map[npDPS] !== undefined ? map[npDPS] : 1;
  }
  function lookupPEB(npDPSClasseI) {
    const map = { nenhum: 1, "III-IV": 0.05, II: 0.02, I: 0.01 };
    return map[npDPSClasseI] !== undefined ? map[npDPSClasseI] : 1;
  }
  function lookupCI(instalacao) {
    return instalacao === "subterranea" ? 0.5 : 1;
  }

  function executar(a) {
    const mem = []; // memória de cálculo: [{grupo, ...calcObj}]
    const push = (grupo, calcObj) => { mem.push(Object.assign({ grupo }, calcObj)); return calcObj.value; };

    const e = a.estrutura;
    const at = a.atmosferico;
    const p = a.protecoes;
    const f = a.fontesDano;
    const NG = at.ng || 0;
    const L = e.comprimento || 0, W = e.largura || 0, H = e.altura || 0;
    const nz = e.numOcupantes || 1, nt = e.numOcupantes || 1, tz = e.taxaOcupacao || 8760;
    const rs = e.tipoConstrucao, rt = e.tipoSuperficie, rp = e.providenciasIncendio, rf = e.riscoIncendio, hz = e.perigoEspecial;

    const gateD3 = e.materiaisExplosivos || e.tipo === "Hospitalar"; // Tabela 2, nota 'a'

    /* ---------- ÁREAS DE EXPOSIÇÃO EQUIVALENTE (Anexo A) ---------- */
    const AD = push("areas", calc_AD_wrap(L, W, H));
    const AM = push("areas", calc_AM_wrap(L, W));

    let NDJ = 0;
    if (e.temEstruturaAdjacente && e.distanciaAdjacente && e.alturaAdjacente) {
      mem.push({ grupo: "areas", formula: "N_DJ", norma: "ABNT NBR 5419-2:2026, 6.4.1, NOTA", substituicao: "N_DJ não calculado com rigor — requer dimensões (L,W) da estrutura adjacente, não coletadas. A norma permite desprezar N_DJ na maioria dos casos práticos." });
    }

    // Linhas — soma de contribuições de cada linha cadastrada (cada uma como trecho distinto, 6.4.3)
    let NL_total = 0, NI_total = 0;
    const todasLinhas = [...a.linhas.energia.map((l) => ({ ...l, origemTipo: "energia" })), ...a.linhas.sinal.map((l) => ({ ...l, origemTipo: "sinal", tipoLinha: 1 }))];
    todasLinhas.forEach((ln, idx) => {
      const CI = lookupCI(ln.instalacao);
      const CE = ln.ambiente;
      const CT = ln.tipoLinha;
      const LL = ln.comprimento || 1000;
      const AL = NEMAX_CALC.calc_AL(LL);
      mem.push(Object.assign({ grupo: "areas", item: `Linha ${idx + 1} (${ln.origemTipo})` }, AL));
      const NLcalc = NEMAX_CALC.calc_NL(NG, AL.value, CI, CE, CT);
      mem.push(Object.assign({ grupo: "eventos", item: `Linha ${idx + 1} (${ln.origemTipo})` }, NLcalc));
      NL_total += NLcalc.value;

      const AI = NEMAX_CALC.calc_AI(LL);
      mem.push(Object.assign({ grupo: "areas", item: `Linha ${idx + 1} (${ln.origemTipo})` }, AI));
      const NIcalc = NEMAX_CALC.calc_NI(NG, AI.value, CI, CE, CT);
      mem.push(Object.assign({ grupo: "eventos", item: `Linha ${idx + 1} (${ln.origemTipo})` }, NIcalc));
      NI_total += NIcalc.value;
    });

    /* ---------- EVENTOS PERIGOSOS (Anexo A) ---------- */
    const CD = e.localizacaoRelativa;
    const ND = push("eventos", NEMAX_CALC.calc_ND(NG, AD, CD));
    const NM = push("eventos", NEMAX_CALC.calc_NM(NG, AM));

    /* ---------- PROBABILIDADES (Anexo B) ---------- */
    const PB = lookupPB(p.npSpda);
    mem.push({ grupo: "probabilidades", formula: "P_B (Tabela B.2)", norma: "ABNT NBR 5419-2:2026, B.3.2", substituicao: `NP do SPDA = ${p.npSpda} → P_B = ${PB}` });
    const PTA = p.medidaToquePasso;
    const PA = push("probabilidades", NEMAX_CALC.calc_PA(PTA, PB));

    const PSPD = lookupPSPD(p.npDPS);
    mem.push({ grupo: "probabilidades", formula: "P_SPD (Tabela B.3)", norma: "ABNT NBR 5419-2:2026, B.4.2", substituicao: `NP do DPS = ${p.npDPS} → P_SPD = ${PSPD}` });
    const condLinha = NEMAX_CALC.tabelas.B4_CLD_CLI[p.condicaoLinha] || NEMAX_CALC.tabelas.B4_CLD_CLI[0];
    const CLD = condLinha.cld, CLI = condLinha.cli;
    mem.push({ grupo: "probabilidades", formula: "C_LD / C_LI (Tabela B.4)", norma: "ABNT NBR 5419-2:2026, B.4.2 / B.5.2", substituicao: `${condLinha.label} → C_LD=${CLD}, C_LI=${CLI}` });

    const PC = push("probabilidades", NEMAX_CALC.calc_PC(PSPD, CLD));

    const KS1obj = NEMAX_CALC.calc_KS1_KS2(p.wm);
    mem.push(Object.assign({ grupo: "probabilidades", item: "K_S1" }, KS1obj));
    const KS2obj = NEMAX_CALC.calc_KS1_KS2(p.wm);
    mem.push(Object.assign({ grupo: "probabilidades", item: "K_S2" }, KS2obj));
    const KS3 = p.ks3Tipo;
    mem.push({ grupo: "probabilidades", formula: "K_S3 (Tabela B.5)", norma: "ABNT NBR 5419-2:2026, B.4.10", substituicao: `Fiação interna selecionada → K_S3 = ${KS3}` });
    const KS4obj = NEMAX_CALC.calc_KS4(p.tensaoSuportavel);
    mem.push(Object.assign({ grupo: "probabilidades" }, KS4obj));
    const PMS = push("probabilidades", NEMAX_CALC.calc_PMS(KS1obj.value, KS2obj.value, KS3, KS4obj.value));
    const PM = push("probabilidades", NEMAX_CALC.calc_PM(PSPD, PMS));

    const PTU = p.medidaToqueLinha;
    const PEB = lookupPEB(p.npDPSClasseI);
    mem.push({ grupo: "probabilidades", formula: "P_EB (Tabela B.7)", norma: "ABNT NBR 5419-2:2026, B.5.2", substituicao: `NP DPS classe I = ${p.npDPSClasseI} → P_EB = ${PEB}` });
    const PLD = NEMAX_CALC.interp_tabela_kv(NEMAX_CALC.tabelas.B8_PLD, p.tensaoSuportavel, p.resistenciaBlindagem);
    mem.push({ grupo: "probabilidades", formula: "P_LD (Tabela B.8)", norma: "ABNT NBR 5419-2:2026, B.5.2", substituicao: `Condição de blindagem × U_W=${p.tensaoSuportavel}kV → P_LD = ${PLD}` });
    const PLI = NEMAX_CALC.interp_tabela_kv(NEMAX_CALC.tabelas.B9_PLI, p.tensaoSuportavel, 0);
    mem.push({ grupo: "probabilidades", formula: "P_LI (Tabela B.9)", norma: "ABNT NBR 5419-2:2026, B.8.2", substituicao: `Linha de energia × U_W=${p.tensaoSuportavel}kV → P_LI = ${PLI}` });

    const PU = push("probabilidades", NEMAX_CALC.calc_PU(PTU, PEB, PLD, CLD));
    const PV = push("probabilidades", NEMAX_CALC.calc_PV(PEB, PLD, CLD));
    const PW = push("probabilidades", NEMAX_CALC.calc_PW(PSPD, PLD, CLD));
    const PZ = push("probabilidades", NEMAX_CALC.calc_PZ(PSPD, PLI, CLI));

    /* ---------- PERDAS (Anexo C) — Perda de vida humana L1 ---------- */
    const LT = e.materiaisExplosivos ? 0.1 : 0.01;
    mem.push({ grupo: "perdas", formula: "L_T (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `${e.materiaisExplosivos ? "Risco de explosão" : "Todos os tipos"} → L_T = ${LT}` });

    let LF;
    if (e.tipo === "Hospitalar" || e.tipo === "Escolar") LF = 0.1;
    else if (e.tipo === "Área Pública" && e.presencaPublico) LF = 0.05;
    else if (e.tipo === "Industrial" || e.tipo === "Comercial") LF = 0.02;
    else LF = 0.01;
    mem.push({ grupo: "perdas", formula: "L_F (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `Tipo de estrutura: ${e.tipo} → L_F = ${LF}` });

    let LO = 0.001;
    if (e.materiaisExplosivos) LO = 0.1;
    else if (e.tipo === "Hospitalar") LO = 0.001;
    mem.push({ grupo: "perdas", formula: "L_O (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `→ L_O = ${LO}` });

    const LA = push("perdas", NEMAX_CALC.calc_LA(rt, LT, nz, nt, tz, rs));
    const LB = push("perdas", NEMAX_CALC.calc_LB(rp, rf, hz, LF, nz, nt, tz, rs));
    const LC = push("perdas", NEMAX_CALC.calc_LC(LO, nz, nt, tz, rs));

    /* ---------- COMPONENTES DE RISCO (Seção 6, Eq. 4-11) ---------- */
    const comp = {};
    if (f.S1) {
      comp.RA = push("componentes", NEMAX_CALC.calc_R(ND, PA, LA, "R_A", 4, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (4)"));
      comp.RB = push("componentes", NEMAX_CALC.calc_R(ND, PB, LB, "R_B", 5, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (5)"));
      if (gateD3) comp.RC = push("componentes", NEMAX_CALC.calc_R(ND, PC, LC, "R_C", 6, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (6)"));
    }
    if (f.S2 && gateD3) {
      comp.RM = push("componentes", NEMAX_CALC.calc_R(NM, PM, LC, "R_M", 7, "ABNT NBR 5419-2:2026, 6.3.1, Eq. (7)"));
    }
    if (f.S3) {
      const NLDJ = NL_total + NDJ;
      comp.RU = push("componentes", NEMAX_CALC.calc_R(NLDJ, PU, LA, "R_U", 8, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (8)"));
      comp.RV = push("componentes", NEMAX_CALC.calc_R(NLDJ, PV, LB, "R_V", 9, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (9)"));
      if (gateD3) comp.RW = push("componentes", NEMAX_CALC.calc_R(NLDJ, PW, LC, "R_W", 10, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (10)"));
    }
    if (f.S4 && gateD3) {
      comp.RZ = push("componentes", NEMAX_CALC.calc_R(NI_total, PZ, LC, "R_Z", 11, "ABNT NBR 5419-2:2026, 6.5.1, Eq. (11)"));
    }

    /* ---------- RISCO R1 (Eq. 1) ---------- */
    const R1 = Object.values(comp).reduce((s, c) => s + c, 0);
    mem.push({
      grupo: "risco_final",
      formula: "R1 = R_A + R_B + R_C + R_M + R_U + R_V + R_W + R_Z",
      norma: "ABNT NBR 5419-2:2026, 4.3.1, Eq. (1)",
      substituicao: `R1 = ${Object.entries(comp).map(([k, v]) => v.toExponential(3)).join(" + ")} = ${R1.toExponential(4)} /ano`,
    });

    /* ---------- RISCO R3 (Eq. 2) — apenas se patrimônio cultural ---------- */
    let R3 = 0;
    if (e.patrimonioCultural) {
      const cz = 1, ct = 1; // sem dados de valor monetário coletados — relação unitária (estrutura inteira = 1 zona)
      const LB3 = NEMAX_CALC.calc_L3(rp, rf, LF, cz, ct);
      mem.push(Object.assign({ grupo: "perdas", item: "L3 — patrimônio cultural" }, LB3));
      const RB3 = f.S1 ? NEMAX_CALC.calc_R(ND, PB, LB3.value, "R_B (L3)", 5, "ABNT NBR 5419-2:2026, 6.2.1") : { value: 0 };
      const RV3 = f.S3 ? NEMAX_CALC.calc_R(NL_total + NDJ, PV, LB3.value, "R_V (L3)", 9, "ABNT NBR 5419-2:2026, 6.4.1") : { value: 0 };
      if (f.S1) mem.push(Object.assign({ grupo: "componentes" }, RB3));
      if (f.S3) mem.push(Object.assign({ grupo: "componentes" }, RV3));
      R3 = RB3.value + RV3.value;
      mem.push({ grupo: "risco_final", formula: "R3 = R_B(L3) + R_V(L3)", norma: "ABNT NBR 5419-2:2026, 4.3.1, Eq. (2)", substituicao: `R3 = ${RB3.value.toExponential(3)} + ${RV3.value.toExponential(3)} = ${R3.toExponential(4)} /ano` });
    } else {
      mem.push({ grupo: "risco_final", formula: "R3", norma: "ABNT NBR 5419-2:2026, 4.2.1.2", substituicao: "Não aplicável — edificação não indicada como patrimônio cultural (Módulo 2)." });
    }

    /* ---------- FREQUÊNCIA DE DANOS F (Seção 7, Eq. 14-15) ---------- */
    let F = 0;
    const compF = {};
    if (f.S1 && gateD3) compF.FC = push("frequencia", NEMAX_CALC.calc_F(ND, PC, "F_C", 15));
    if (f.S2 && gateD3) compF.FM = push("frequencia", NEMAX_CALC.calc_F(NM, PM, "F_M", 15));
    if (f.S3 && gateD3) compF.FW = push("frequencia", NEMAX_CALC.calc_F(NL_total + NDJ, PW, "F_W", 15));
    if (f.S4 && gateD3) compF.FZ = push("frequencia", NEMAX_CALC.calc_F(NI_total, PZ, "F_Z", 15));
    F = Object.values(compF).reduce((s, c) => s + c, 0);
    mem.push({
      grupo: "frequencia", formula: "F = F_B + F_C + F_M + F_V + F_W + F_Z", norma: "ABNT NBR 5419-2:2026, 7.1.3, Eq. (14)",
      substituicao: `Componentes calculados (F_C, F_M, F_W, F_Z): F = ${F.toExponential(4)} /ano. F_B (equipamento em ZPR0A) e a parcela de corrente direta F_V exigem avaliação específica de equipamento conforme 7.1.5 e não estão incluídas nesta soma simplificada.`,
    });

    const RT1 = NEMAX_CALC.constantes.RT1, RT3 = NEMAX_CALC.constantes.RT3;
    const conformeR1 = R1 <= RT1;
    const conformeR3 = !e.patrimonioCultural || R3 <= RT3;
    const conforme = conformeR1 && conformeR3;

    const resultado = {
      calculadoEm: nowISO(),
      AD, AM, ND, NM, NL_total, NI_total, NDJ,
      componentesR: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, v])),
      R1, R3, F,
      RT1, RT3,
      conformeR1, conformeR3, conforme,
      patrimonioCultural: e.patrimonioCultural,
      memoria: mem,
      // Probabilidades finais (cenário COM as medidas de proteção configuradas
      // nesta análise) e fatores físicos intrínsecos (independentes de medidas
      // de proteção — características da estrutura/linha). Expostos aqui para
      // reaproveitamento pelo módulo de R4 (Anexo D), que precisa recalcular
      // as mesmas probabilidades no cenário "sem proteção" (PB=PSPD=PEB=1)
      // sem duplicar a lógica de lookup já implementada nesta função.
      probabilidades: { PA, PB, PC, PM, PU, PV, PW, PZ },
      fatoresFisicos: { PTA, PTU, PLD, PLI, CLD, CLI, PMS },
    };

    a.resultado = resultado;
    return resultado;
  }

  function calc_AD_wrap(L, W, H) { return NEMAX_CALC.calc_AD(L, W, H); }
  function calc_AM_wrap(L, W) { return NEMAX_CALC.calc_AM(L, W); }

  return { executar };
})();

/* ============================================================
   calcularR4 — orquestração do Anexo D (R4, perda econômica) +
   avaliação de custo-benefício (D.2). Reaproveita integralmente os
   N (eventos perigosos) e os fatores físicos intrínsecos já calculados
   e expostos em a.resultado pelo motor de risco principal — não
   duplica nenhuma lógica de lookup de N ou de fatores físicos.

   Conforme D.1.1, R4 é informativo/opcional: não substitui nem altera
   a validação de R1/R3, que continua sendo o critério normativo de
   necessidade de proteção. Esta função só executa se
   a.economico.avaliar === true e a.resultado já existir.
   ============================================================ */
export function calcularR4(a) {
  if (!a.economico || !a.economico.avaliar) return null;
  if (!a.resultado || !a.resultado.probabilidades) return null;

  const econ = a.economico;
  const r = a.resultado;
  const f = a.fontesDano || {};
  const fat = r.fatoresFisicos;
  const probComProtecao = r.probabilidades;

  const ca = parseFloat(econ.ca) || 0;
  const cb = parseFloat(econ.cb) || 0;
  const cc = parseFloat(econ.cc) || 0;
  const cs = parseFloat(econ.cs) || 0;
  const modoSimplificado = !!econ.modoSimplificado;
  // No modo simplificado, R4 em si não depende de ct (as relações já são 1
  // por definição — D.1, nota da Tabela D.1), mas a avaliação de custo-
  // benefício em R$ (D.2) sempre precisa de um valor total real. Por isso
  // usa-se um campo único (ctSimplificado) nesse modo, em vez da soma
  // detalhada ca+cb+cc+cs (que só faz sentido no modo completo, por zona).
  const ct = modoSimplificado ? (parseFloat(econ.ctSimplificado) || 0) : (ca + cb + cc + cs);

  if (ct <= 0 && !modoSimplificado) return null; // sem valores monetários, modo completo não pode calcular

  const lfItem = NEMAX_CALC_R4.TABELA_D2_L4.LF[parseInt(econ.lfCategoria)];
  const loItem = NEMAX_CALC_R4.TABELA_D2_L4.LO[parseInt(econ.loCategoria)];
  if (!lfItem || !loItem) return null; // categorias de perda ainda não selecionadas

  const LT = NEMAX_CALC_R4.TABELA_D2_L4.LT[0].value;
  const LF = lfItem.value;
  const LO = loItem.value;

  // Fatores físicos intrínsecos da estrutura/linha (rt, rp, rf, hz) — os
  // mesmos usados no cálculo de R1, lidos do Módulo 2 (não dependem de
  // medidas de proteção, por isso são idênticos nos cenários com/sem proteção)
  const e = a.estrutura || {};
  const rt = e.tipoSuperficie, rp = e.providenciasIncendio, rf = e.riscoIncendio;

  // --- Perdas L4 (Tabela D.1) ---
  const LA4 = NEMAX_CALC_R4.calc_LA4_LU4(rt, LT, ca, ct, modoSimplificado);
  const LB4 = NEMAX_CALC_R4.calc_LB4_LV4(rp, rf, LF, ca, cb, cc, cs, ct, modoSimplificado);
  const LC4 = NEMAX_CALC_R4.calc_LC4_LM4_LW4_LZ4(LO, cs, ct, modoSimplificado);

  // --- Cenário COM proteção (probabilidades já calculadas pela análise atual) ---
  function montarComponentes(prob) {
    const comp = {};
    if (f.S1) {
      if (econ.temAnimaisComerciais) comp.RA4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PA, LA4.value, "RA4", "Eq. (D.1)");
      comp.RB4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PB, LB4.value, "RB4", "Eq. (D.3)");
      comp.RC4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PC, LC4.value, "RC4", "Eq. (D.4)");
    }
    if (f.S2) {
      comp.RM4 = NEMAX_CALC_R4.calc_R4_componente(r.NM, prob.PM, LC4.value, "RM4", "Eq. (D.4)");
    }
    if (f.S3) {
      const NLDJ = r.NL_total + r.NDJ;
      if (econ.temAnimaisComerciais) comp.RU4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PU, LA4.value, "RU4", "Eq. (D.1)/(D.2)");
      comp.RV4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PV, LB4.value, "RV4", "Eq. (D.3)");
      comp.RW4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PW, LC4.value, "RW4", "Eq. (D.4)");
    }
    if (f.S4) {
      comp.RZ4 = NEMAX_CALC_R4.calc_R4_componente(r.NI_total, prob.PZ, LC4.value, "RZ4", "Eq. (D.4)");
    }
    return comp;
  }

  const componentesCom = montarComponentes(probComProtecao);
  const R4_com = NEMAX_CALC_R4.calc_R4_total(componentesCom);

  // --- Cenário SEM proteção: PB=PSPD=PEB=1, mantendo os fatores físicos
  // intrínsecos (PTA, PTU, PLD, PLI, CLD, CLI, PMS) idênticos, já que estes
  // não são "medidas de proteção a instalar", são características fixas da
  // estrutura/linha conectada.
  const probSemProtecao = {
    PA: fat.PTA * 1,
    PB: 1,
    PC: 1 * fat.CLD,
    PM: 1 * fat.PMS,
    PU: fat.PTU * 1 * fat.PLD * fat.CLD,
    PV: 1 * fat.PLD * fat.CLD,
    PW: 1 * fat.PLD * fat.CLD,
    PZ: 1 * fat.PLI * fat.CLI,
  };
  const componentesSem = montarComponentes(probSemProtecao);
  const R4_sem = NEMAX_CALC_R4.calc_R4_total(componentesSem);

  const resultado = { ct, ca, cb, cc, cs, modoSimplificado, LA4, LB4, LC4, lfItem, loItem, R4_com, R4_sem, componentesCom, componentesSem };

  // --- Avaliação de custo-benefício (D.2), só se os campos de custo
  // estiverem preenchidos — é uma extensão opcional dentro do já opcional R4 ---
  const CP = parseFloat(econ.custoProtecao);
  const i = parseFloat(econ.taxaJuros);
  const aTax = parseFloat(econ.taxaAmortizacao);
  const m = parseFloat(econ.taxaManutencao);
  if (!isNaN(CP) && !isNaN(i) && !isNaN(aTax) && !isNaN(m)) {
    const CL = NEMAX_CALC_R4.calc_CL(R4_sem.value, ct);
    const CRL = NEMAX_CALC_R4.calc_CRL(R4_com.value, ct);
    const CPM = NEMAX_CALC_R4.calc_CPM(CP, i, aTax, m);
    const SM = NEMAX_CALC_R4.calc_SM(CL.value, CPM.value, CRL.value);
    const justificativa = NEMAX_CALC_R4.avaliarJustificativaCusto(CL.value, CRL.value, CPM.value);
    Object.assign(resultado, { CL, CRL, CPM, SM, justificativa });
  }

  return resultado;
}
