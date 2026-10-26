/*
 * Estimated bill of materials for the SPDA sized in the Part 3 module
 * (ABNT NBR 5419-3:2026). Support for budgeting, not a normative calculation.
 */
import { NEMAX_CALC_P3 } from "./nbr5419-3.js";

/* ----------------------------------------------------------
   2) LISTA DE MATERIAIS / QUANTITATIVO ESTIMADO

   Converte os dados de dimensionamento em quantidades físicas
   estimadas (comprimento de cabo, número de conectores, área de
   eletrodo etc.), cruzando com a seção mínima das Tabelas 7 e 8.
   É uma estimativa de apoio ao orçamento — não substitui o
   detalhamento de projeto executivo, e isso é declarado no
   próprio quantitativo.
   ---------------------------------------------------------- */
export function calcularQuantitativoMateriais(a) {
  const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
  if (NP === "nenhum" || !a.dimensionamento) return null;
  const d = a.dimensionamento;
  const e = a.estrutura || {};
  const itens = [];

  const compE = parseFloat(e.comprimento) || 0;
  const largE = parseFloat(e.largura) || 0;
  const altE = parseFloat(e.altura) || 0;
  const perimetro = parseFloat(d.perimetroEstrutura) || (2 * (compE + largE));

  // --- Captação: comprimento de condutor estimado conforme método ---
  let compCaptacao = 0, obsCaptacao = "";
  if (d.metodoCaptacao === "malha") {
    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
    const modulo = tab2.malha;
    // estimativa: perímetro fechando os módulos + condutores internos formando a malha (grade compE x largE)
    const nLinhasH = largE > 0 ? Math.max(0, Math.floor(largE / modulo) - 1) : 0;
    const nLinhasV = compE > 0 ? Math.max(0, Math.floor(compE / modulo) - 1) : 0;
    const internos = nLinhasH * compE + nLinhasV * largE;
    compCaptacao = perimetro + internos;
    obsCaptacao = `Perímetro (${perimetro.toFixed(1)} m) + malha interna estimada para módulos de ${tab2.malhaLabel} m`;
  } else if (d.metodoCaptacao === "esfera") {
    // estimativa conservadora: condutor perimetral na borda da cobertura (captação em anel periférico)
    compCaptacao = perimetro;
    obsCaptacao = `Estimativa de condutor perimetral na borda da cobertura (verificar pontos/captores adicionais em projeto)`;
  } else if (d.metodoCaptacao === "angulo") {
    compCaptacao = perimetro;
    obsCaptacao = `Estimativa de condutor de interligação dos captores verticais na base (mastros não incluídos)`;
  }
  if (compCaptacao > 0) {
    itens.push({
      grupo: "Captação", descricao: `Condutor de captação — ${d.materialCaptacao}`,
      quantidade: compCaptacao, unidade: "m", observacao: obsCaptacao,
    });
  }

  // --- Descida: comprimento total (nº descidas × altura) ---
  if (perimetro && !d.descidaIsolada) {
    const rDesc = NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP);
    const alturaDescida = altE > 0 ? altE : 0;
    if (alturaDescida > 0) {
      itens.push({
        grupo: "Descida", descricao: `Condutor de descida — ${d.materialCaptacao}`,
        quantidade: rDesc.value * alturaDescida, unidade: "m",
        observacao: `${rDesc.value} descidas × ${alturaDescida.toFixed(1)} m (altura da edificação)`,
      });
      itens.push({
        grupo: "Descida", descricao: `Conexão de ensaio (caixa de inspeção)`,
        quantidade: rDesc.value, unidade: "un",
        observacao: `1 por condutor de descida, a ≈1,5 m do piso (5.4.6.1)`,
      });
    }
  }

  // --- Aterramento: eletrodo + complementação ---
  const rho = parseFloat(d.resistividadeSolo);
  if (rho || rho === 0) {
    const rl1 = NEMAX_CALC_P3.calc_comprimentoMinEletrodo(NP, rho);
    const eletrodoBase = perimetro || 0;
    if (eletrodoBase > 0) {
      itens.push({
        grupo: "Aterramento", descricao: `Eletrodo de aterramento em anel — ${d.materialAterramento}`,
        quantidade: eletrodoBase, unidade: "m",
        observacao: `Perímetro da edificação, enterrado a ≥0,5 m de profundidade (5.5.3.1)`,
      });
    }
    const area = parseFloat(d.areaEletrodo);
    if (area) {
      const rRe = NEMAX_CALC_P3.calc_raioEquivalenteEletrodo(area);
      const rDisp = NEMAX_CALC_P3.calc_dispensaComplementacao(rRe.value, rl1.value);
      if (!rDisp.value && perimetro) {
        const rDesc = perimetro && !d.descidaIsolada ? NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP) : null;
        const comp = NEMAX_CALC_P3.calc_eletrodoComplementar(rRe.value, rl1.value);
        if (rDesc) {
          itens.push({
            grupo: "Aterramento", descricao: `Eletrodo complementar radial — ${d.materialAterramento}`,
            quantidade: comp.lr.value * rDesc.value, unidade: "m",
            observacao: `${comp.lr.value.toFixed(2)} m × ${rDesc.value} descidas (alternativa: eletrodos verticais de ${comp.lv.value.toFixed(2)} m cada)`,
          });
        }
      }
    }
  }

  // --- Conexões / fixadores (estimativa por metro linear total) ---
  const totalLinear = itens.filter((i) => i.unidade === "m").reduce((s, i) => s + i.quantidade, 0);
  if (totalLinear > 0) {
    itens.push({
      grupo: "Fixação", descricao: `Suportes/fixadores de condutor`,
      quantidade: Math.ceil(totalLinear / 1.0), unidade: "un",
      observacao: `Estimativa a cada 1,0 m em trechos horizontais (5.6.2.2); revisar conforme trajeto real do projeto`,
    });
  }

  return itens;
}
