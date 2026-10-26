/* ABNT NBR 5419-4:2026 surge protection engine: LPZ classes, Table 1, Table A.1 (Uw), Table D.1 (Iimp) and coordinated SPD selection (Annex C). */

/* ==========================================================================
   NEMAX_CALC_P4 — Motor de cálculo, ABNT NBR 5419-4:2026
   Parte 4: Sistemas elétricos e eletrônicos internos à estrutura

   ENTREGA 1 (escopo confirmado com o usuário em 20/06/2026):
     - Zoneamento ZPR (classificação, §4.3)
     - Tabela 1 (seções mínimas de equipotencialização, 5.6)
     - Anexo C completo — seleção e instalação de sistema coordenado de DPS
       (Up/f, condições C.2.1.9, Tabela A.1 de Uw, Tabela D.1 de Iimp)

   FORA DE ESCOPO NESTA ENTREGA (aguardando ABNT NBR 5419-1:2026):
     - Anexo A.4 (campo magnético / blindagem em forma de grade)
     - Anexo A.5 (tensões e correntes induzidas em laços)
     Ambos dependem de IF/máx, IFN/máx, IS/máx e T1 por Nível de Proteção,
     que são tabelados na Parte 1 e NÃO devem ser estimados ou inventados.

   Padrão de retorno de toda função normativa:
     { value, formula, norma, substituicao, ...termos }
   idêntico ao padrão usado em NEMAX_CALC (Parte 2) e NEMAX_CALC_P3 (Parte 3).

   Todas as referências de item/tabela/equação foram extraídas e conferidas
   diretamente do texto da ABNT NBR 5419-4:2026 (107 páginas, leitura integral
   de §1 a Anexo D + Bibliografia). Nenhum valor foi estimado visualmente a
   partir de figura sem equação companion no texto.
   ========================================================================== */

export const NEMAX_CALC_P4 = (function () {
  "use strict";

  /* ==========================================================================
     TERMINOLOGIA NORMATIVA DE REFERÊNCIA (não é tabela de cálculo — é a base
     textual que evita confusão entre PDA / SPDA / MPS / LEMP / ZPR, conforme
     pedido explícito do usuário. Usado para tooltips/textos de apoio na UI.)
     ========================================================================== */
  const TERMINOLOGIA = {
    PDA: {
      sigla: "PDA",
      termo: "Proteção contra Descargas Atmosféricas",
      definicao: "Sistema completo para proteção de estruturas contra as descargas atmosféricas, incluindo SPDA externo, SPDA interno e MPS.",
      norma: "ABNT NBR 5419-4:2026, 3.103",
    },
    SPDA: {
      sigla: "SPDA",
      termo: "Sistema de Proteção contra Descargas Atmosféricas",
      definicao: "Sistema utilizado para reduzir ferimentos em pessoas e animais, e danos físicos resultantes das descargas atmosféricas diretas na estrutura.",
      norma: "ABNT NBR 5419-4:2026, 3.109",
    },
    SPDA_EXTERNO: {
      sigla: "SPDA externo",
      definicao: "Parte do SPDA composta pelos subsistemas de captação, descida e aterramento.",
      norma: "ABNT NBR 5419-4:2026, 3.110",
    },
    SPDA_INTERNO: {
      sigla: "SPDA interno",
      definicao: "Parte do SPDA responsável por minimizar os efeitos dos centelhamentos perigosos e choques elétricos, composto por ligações equipotenciais para descargas atmosféricas (equipotencialização) e distância de segurança (s).",
      norma: "ABNT NBR 5419-4:2026, 3.111",
    },
    MPS: {
      sigla: "MPS",
      termo: "Medidas de Proteção contra Surtos causados por LEMP",
      definicao: "Conjunto de medidas tomadas para proteger os sistemas internos contra os efeitos causados por LEMP.",
      norma: "ABNT NBR 5419-4:2026, 3.87",
    },
    LEMP: {
      sigla: "LEMP",
      termo: "Pulso Eletromagnético causado por uma Descarga Atmosférica",
      definicao: "Efeitos eletromagnéticos causados pela corrente das descargas atmosféricas por meio de acoplamento resistivo, indutivo e capacitivo, que criam surtos e campos eletromagnéticos.",
      norma: "ABNT NBR 5419-4:2026, 3.104",
    },
    ZPR: {
      sigla: "ZPR",
      termo: "Zona de Proteção contra Raio",
      definicao: "Volume no qual o ambiente eletromagnético causado pelo raio é estabelecido.",
      norma: "ABNT NBR 5419-4:2026, 3.137",
    },
    NOTA_LIMITE_SPDA3: "Ligações equipotenciais de acordo com a ABNT NBR 5419-3 protegem apenas contra centelhamentos perigosos. A proteção contra surtos de sistemas internos requer MPS de acordo com a ABNT NBR 5419-4 (Nota, 4.4.5.5).",
  };

  /* ==========================================================================
     §4.3 — CLASSIFICAÇÃO DE ZONAS DE PROTEÇÃO CONTRA RAIO (ZPR)
     Norma: 4.3.1
     Não é um cálculo numérico — é uma classificação textual normativa,
     usada para orientar o usuário na divisão da estrutura em zonas.
     ========================================================================== */
  const ZPR_CLASSES = [
    {
      id: "0A",
      label: "ZPR 0A",
      tipo: "externa",
      ameaca: "Queda direta e campo eletromagnético total da descarga atmosférica.",
      correntes: "Sistemas internos podem estar sujeitos à corrente total ou parcial da descarga atmosférica.",
      norma: "ABNT NBR 5419-4:2026, 4.3.1.1.1-a)",
    },
    {
      id: "0B",
      label: "ZPR 0B",
      tipo: "externa",
      ameaca: "Protegida contra queda direta, mas exposta ao campo eletromagnético total da descarga atmosférica.",
      correntes: "Sistemas internos podem estar sujeitos à corrente parcial da descarga atmosférica.",
      norma: "ABNT NBR 5419-4:2026, 4.3.1.1.1-b)",
    },
    {
      id: "1",
      label: "ZPR 1",
      tipo: "interna",
      ameaca: "Corrente de surto limitada por divisão de corrente e por interfaces isolantes ou DPS na fronteira.",
      correntes: "Blindagem espacial pode atenuar o campo eletromagnético da descarga atmosférica.",
      norma: "ABNT NBR 5419-4:2026, 4.3.1.1.2-a)",
    },
    {
      id: "2+",
      label: "ZPR 2, ..., n",
      tipo: "interna",
      ameaca: "Corrente de surto ainda mais limitada por nova divisão de corrente e por interfaces isolantes/DPS adicionais na fronteira.",
      correntes: "Blindagem espacial adicional pode atenuar ainda mais o campo eletromagnético.",
      norma: "ABNT NBR 5419-4:2026, 4.3.1.1.2-b)",
    },
  ];

  /* MPS básicas — vínculo de cada medida com a seção correspondente (4.4) */
  const MPS_BASICAS = [
    { id: "aterramento_rede", label: "Aterramento e ligação equipotencial em rede", secaoNorma: "Seção 5", item: "4.4.1", jaExisteNoSistema: "Parcial — aterramento físico já no Módulo 8 (Parte 3); ligação em rede (Tabela 1) nesta entrega." },
    { id: "blindagem_roteamento", label: "Blindagem magnética e roteamento das linhas elétricas", secaoNorma: "Seção 6", item: "4.4.2", jaExisteNoSistema: "Não implementado nesta entrega — depende de IF/máx, IFN/máx, IS/máx, T1 (Parte 1)." },
    { id: "dps_coordenado", label: "Coordenação entre DPS", secaoNorma: "Seção 7 / Anexo C", item: "4.4.3", jaExisteNoSistema: "Implementado nesta entrega." },
    { id: "interfaces_isolantes", label: "Interfaces isolantes", secaoNorma: "Seção 8", item: "4.4.4", jaExisteNoSistema: "Orientação textual nesta entrega (sem motor de cálculo dedicado — a norma remete a C.2.1)." },
  ];

  function listarZPR() {
    return ZPR_CLASSES;
  }

  function listarMPSBasicas() {
    return MPS_BASICAS;
  }

  /* ==========================================================================
     TABELA 1 — Seção transversal mínima para componentes de equipotencialização
     Norma: 5.6.1, Tabela 1
     ========================================================================== */
  const TABELA1_EQUIPOTENCIALIZACAO = [
    { componente: "Barras de equipotencialização", material: "Cobre", secaoMM2: 50 },
    { componente: "Barras de equipotencialização", material: "Aço revestido", secaoMM2: 50 },
    { componente: "Condutores para conexão de barras de equipotencialização para o subsistema de aterramento", material: "Cobre", secaoMM2: 50 },
    { componente: "Condutores para conexão de barras de equipotencialização para o subsistema de aterramento", material: "Aço revestido", secaoMM2: 70 },
    { componente: "Condutores para conexão entre barras de equipotencialização (conduzindo total ou parte significativa da corrente da descarga atmosférica)", material: "Cobre", secaoMM2: 16 },
    { componente: "Condutores para conexão entre barras de equipotencialização (conduzindo total ou parte significativa da corrente da descarga atmosférica)", material: "Alumínio", secaoMM2: 25 },
    { componente: "Condutores para conexão entre barras de equipotencialização (conduzindo total ou parte significativa da corrente da descarga atmosférica)", material: "Aço revestido", secaoMM2: 50 },
    { componente: "Condutores para conexão de partes metálicas internas às barras de equipotencialização (conduzindo parcela da corrente da descarga atmosférica)", material: "Cobre", secaoMM2: 6 },
    { componente: "Condutores para conexão de partes metálicas internas às barras de equipotencialização (conduzindo parcela da corrente da descarga atmosférica)", material: "Alumínio", secaoMM2: 10 },
    { componente: "Condutores para conexão de partes metálicas internas às barras de equipotencialização (conduzindo parcela da corrente da descarga atmosférica)", material: "Aço revestido", secaoMM2: 16 },
    { componente: "Condutores para interligação dos DPS", material: "Cobre — Classe I", secaoMM2: 16 },
    { componente: "Condutores para interligação dos DPS", material: "Cobre — Classe II", secaoMM2: 6 },
    { componente: "Condutores para interligação dos DPS", material: "Cobre — Classe III", secaoMM2: 2.5 },
  ];

  function tabela1_secaoMinima(componenteId, material) {
    const linha = TABELA1_EQUIPOTENCIALIZACAO.find(
      (l) => l.componente === componenteId && l.material === material
    );
    if (!linha) return null;
    return {
      value: linha.secaoMM2,
      formula: "Seção mínima (Tabela 1)",
      norma: "ABNT NBR 5419-4:2026, 5.6.1, Tabela 1",
      substituicao: `${linha.componente} — ${linha.material} → ${linha.secaoMM2} mm²`,
    };
  }

  /* ==========================================================================
     TABELA A.1 — Suportabilidade a impulso requerida dos componentes (Uw)
     Norma: A.2.4.2, Tabela A.1
     Tensões nominais conforme a tabela original; inclui 110-127V/220-254V
     (padrão brasileiro de baixa tensão).
     Categorias de suportabilidade a impulso (kV) por categoria de produto.
     ========================================================================== */
  const TABELA_A1_UW = [
    { faixaFase: "110 a 127", faixaLinha: "220 a 254", catIV: 4, catIII: 2.5, catII: 1.5, catI: 0.8 },
    { faixaFase: "220 a 254", faixaLinha: "380 a 480", catIV: 6, catIII: 4, catII: 2.5, catI: 1.5 },
    { faixaFase: "380 a 480", faixaLinha: "658 a 830", catIV: 8, catIII: 6, catII: 4, catI: 2.5 },
  ];

  const CATEGORIAS_PRODUTO_UW = {
    IV: { label: "Categoria IV — produto a ser utilizado na entrada da instalação", key: "catIV" },
    III: { label: "Categoria III — produto a ser utilizado em circuitos de distribuição e circuitos terminais", key: "catIII" },
    II: { label: "Categoria II — equipamentos de utilização", key: "catII" },
    I: { label: "Categoria I — produtos especialmente protegidos", key: "catI" },
  };

  function tabelaA1_uw(faixaFase, categoria) {
    const linha = TABELA_A1_UW.find((l) => l.faixaFase === faixaFase);
    if (!linha) return null;
    const cat = CATEGORIAS_PRODUTO_UW[categoria];
    const value = linha[cat.key];
    return {
      value,
      formula: "Uw requerida (Tabela A.1)",
      norma: "ABNT NBR 5419-4:2026, A.2.4.2, Tabela A.1",
      substituicao: `Tensão nominal de fase ${faixaFase} V, ${cat.label} → Uw = ${value} kV`,
    };
  }

  /* Suportabilidade de entradas de sinal ETI (A.2.3) — valores fixos, não tabela */
  const SUPORTABILIDADE_SINAL_ETI = {
    linhaExterna: {
      modoComum: 1.5,
      modoDiferencial: 1.5,
      norma: "ABNT NBR 5419-4:2026, A.2.3-a)",
      descricao: "Porta conectada à linha externa (linha que entra na estrutura)",
    },
    linhaInternaNaoBlindada: {
      modoComum: 1.0,
      norma: "ABNT NBR 5419-4:2026, A.2.3-b)",
      descricao: "Porta conectada à linha interna não blindada (sem conexão direta a linha externa)",
    },
  };

  /* ==========================================================================
     TABELA D.1 — Valores preferenciais para Iimp (DPS classe I, conexão CT1)
     Norma: D.1.2, Tabela D.1
     ========================================================================== */
  const TABELA_D1_IIMP = [
    { iimp: 1, q: 0.5, wr: 0.25 },
    { iimp: 2, q: 1, wr: 1 },
    { iimp: 5, q: 2.5, wr: 6.25 },
    { iimp: 10, q: 5, wr: 25 },
    { iimp: 12.5, q: 6.25, wr: 39 },
    { iimp: 20, q: 10, wr: 100 },
    { iimp: 25, q: 12.5, wr: 156 },
  ];

  function tabelaD1_porIimp(iimp) {
    const linha = TABELA_D1_IIMP.find((l) => l.iimp === iimp);
    if (!linha) return null;
    return {
      value: linha,
      formula: "Iimp, Q, W/R (Tabela D.1)",
      norma: "ABNT NBR 5419-4:2026, D.1.2, Tabela D.1",
      substituicao: `Iimp = ${linha.iimp} kA → Q = ${linha.q} C, W/R = ${linha.wr} kJ/Ω`,
    };
  }

  /* ==========================================================================
     ANEXO C — SELEÇÃO E INSTALAÇÃO DE UM SISTEMA COORDENADO DE DPS
     ========================================================================== */

  /* C.2.1.3 — Up/f para DPS tipo limitador de tensão: Up/f = Up + ΔU */
  function calc_UpEfetivo_limitador(Up, deltaU) {
    const value = Up + deltaU;
    return {
      value,
      formula: "Up/f = Up + ΔU",
      norma: "ABNT NBR 5419-4:2026, C.2.1.3-a)",
      substituicao: `Up/f = ${Up} + ${deltaU} = ${value.toFixed(3)} kV`,
      Up, deltaU,
    };
  }

  /* C.2.1.3 — Up/f para DPS tipo comutador de tensão: Up/f = Máx(Up, ΔU) */
  function calc_UpEfetivo_comutador(Up, deltaU) {
    const value = Math.max(Up, deltaU);
    return {
      value,
      formula: "Up/f = Máx.(Up, ΔU)",
      norma: "ABNT NBR 5419-4:2026, C.2.1.3-b)",
      substituicao: `Up/f = Máx.(${Up}, ${deltaU}) = ${value.toFixed(3)} kV`,
      Up, deltaU,
    };
  }

  /* C.2.1.4, NOTA — estimativa de ΔU quando não informado pelo fabricante/projetista:
     ΔU = 0,1 kV por kA e por metro de comprimento dos condutores de ligação do DPS.
     Esta é uma estimativa EXPLICITAMENTE PERMITIDA pela norma como nota orientativa
     (não é um valor "inventado" pelo sistema) — deve ser sinalizada como tal na UI. */
  function calc_deltaU_estimado(correnteKA, comprimentoM) {
    const value = 0.1 * correnteKA * comprimentoM;
    return {
      value,
      formula: "ΔU = 0,1 kV/kA/m × I × l (estimativa orientativa)",
      norma: "ABNT NBR 5419-4:2026, C.2.1.4, NOTA",
      substituicao: `ΔU = 0,1 × ${correnteKA} kA × ${comprimentoM} m = ${value.toFixed(3)} kV`,
      avisoEstimativa: "Valor obtido por estimativa orientativa da norma (NOTA de C.2.1.4), não por medição ou dado de fabricante. Usar com cautela; substituir por valor real do projeto/fabricante quando disponível.",
      correnteKA, comprimentoM,
    };
  }

  /* C.2.1.9 — verificação das 4 condições de proteção adequada do equipamento.
     Retorna qual condição foi satisfeita (se alguma) e o detalhamento de cada uma.
     Sistema crítico com circuito de até 10 m: vale somente a condição c)
     (0,5 × Uw); as condições a) e b) não bastam para declarar o equipamento
     protegido. */
  function verificarCondicaoProtecao(UpF, Uw, comprimentoCircuitoM, sistemaCritico) {
    const condicoes = [];
    const avisoCritico = "Não aplicável — sistema crítico: vale a condição c) (C.2.1.9-c).";

    const condA_comprimento = comprimentoCircuitoM !== null && comprimentoCircuitoM !== undefined && comprimentoCircuitoM <= 0.01; // "desprezável"
    const condA_aplicavel = condA_comprimento && !sistemaCritico;
    const condA_atendida = UpF <= Uw;
    condicoes.push({
      id: "a",
      descricao: "Up/f ≤ Uw — comprimento do circuito entre o DPS e o equipamento desprezável",
      norma: "ABNT NBR 5419-4:2026, C.2.1.9-a)",
      aplicavel: condA_aplicavel,
      atendida: condA_aplicavel && condA_atendida,
      limite: Uw,
      detalhe: condA_comprimento && sistemaCritico ? avisoCritico : `Up/f (${UpF.toFixed(3)} kV) ${condA_atendida ? "≤" : ">"} Uw (${Uw} kV)`,
    });

    const limiteB = 0.8 * Uw;
    const condB_comprimento = comprimentoCircuitoM !== null && comprimentoCircuitoM !== undefined && comprimentoCircuitoM <= 10;
    const condB_aplicavel = condB_comprimento && !sistemaCritico;
    const condB_atendida = UpF <= limiteB;
    condicoes.push({
      id: "b",
      descricao: "Up/f ≤ 0,8 × Uw — comprimento do circuito não maior que 10 m",
      norma: "ABNT NBR 5419-4:2026, C.2.1.9-b)",
      aplicavel: condB_aplicavel,
      atendida: condB_aplicavel && condB_atendida,
      limite: limiteB,
      detalhe: condB_comprimento && sistemaCritico ? avisoCritico : `Up/f (${UpF.toFixed(3)} kV) ${condB_atendida ? "≤" : ">"} 0,8×Uw (${limiteB.toFixed(3)} kV)`,
    });

    const limiteC = 0.5 * Uw;
    const condC_aplicavel = comprimentoCircuitoM !== null && comprimentoCircuitoM !== undefined && comprimentoCircuitoM <= 10 && !!sistemaCritico;
    const condC_atendida = UpF <= limiteC;
    condicoes.push({
      id: "c",
      descricao: "Up/f ≤ 0,5 × Uw — comprimento ≤ 10 m e falha do sistema interno crítica (conforme NBR 5419-2)",
      norma: "ABNT NBR 5419-4:2026, C.2.1.9-c)",
      aplicavel: condC_aplicavel,
      atendida: condC_aplicavel && condC_atendida,
      limite: limiteC,
      detalhe: sistemaCritico
        ? `Up/f (${UpF.toFixed(3)} kV) ${condC_atendida ? "≤" : ">"} 0,5×Uw (${limiteC.toFixed(3)} kV)`
        : "Não aplicável — sistema não indicado como crítico.",
    });

    const condD_aplicavel = comprimentoCircuitoM !== null && comprimentoCircuitoM !== undefined && comprimentoCircuitoM > 10;
    condicoes.push({
      id: "d",
      descricao: "Distância > 10 m ou Up baixo o suficiente indisponível — medidas alternativas (DPS adicional próximo ao equipamento, ou DPS de duas portas com cabeamento blindado/roteamento conjunto)",
      norma: "ABNT NBR 5419-4:2026, C.2.1.9-d)",
      aplicavel: condD_aplicavel,
      atendida: false, // condição "d" não é uma verificação numérica — é uma medida alternativa a adotar
      limite: null,
      detalhe: condD_aplicavel
        ? "Comprimento do circuito superior a 10 m — adotar medida alternativa conforme C.2.1.9-d)."
        : "Não aplicável — comprimento do circuito não excede 10 m.",
    });

    const algumaAtendida = condicoes.some((c) => c.atendida);
    const condicaoAplicavelAtendida = condicoes.find((c) => c.aplicavel && c.atendida);

    return {
      protegido: algumaAtendida,
      condicaoSatisfeita: condicaoAplicavelAtendida ? condicaoAplicavelAtendida.id : null,
      condicoes,
      norma: "ABNT NBR 5419-4:2026, C.2.1.9",
      UpF, Uw, comprimentoCircuitoM, sistemaCritico,
    };
  }

  /* C.2.1.6 — alerta de oscilação por circuito longo entre DPS e equipamento:
     mesmo com Up/f ≤ Uw, sobretensão pode dobrar (até 2×Up/f) em circuito aberto
     se o comprimento for "muito longo". A norma não dá um limiar numérico exato
     para "muito longo" neste parágrafo — é tratado como alerta qualitativo. */
  function avisoOscilacaoCircuitoLongo(UpF, Uw) {
    const UpF_dobrado = 2 * UpF;
    const risco = UpF_dobrado > Uw;
    return {
      risco,
      UpF, UpF_dobrado, Uw,
      norma: "ABNT NBR 5419-4:2026, C.2.1.6",
      mensagem: risco
        ? `Se o comprimento do circuito entre o DPS e o equipamento for muito longo, fenômenos de oscilação podem elevar a sobretensão até 2×Up/f = ${UpF_dobrado.toFixed(3)} kV, que excede Uw (${Uw} kV) em caso de circuito aberto nos terminais do equipamento — mesmo com Up/f ≤ Uw satisfeito. Avaliar roteamento e comprimento reais do circuito.`
        : `2×Up/f = ${UpF_dobrado.toFixed(3)} kV permanece ≤ Uw (${Uw} kV); risco de oscilação por circuito longo é menos crítico, mas a verificação de roteamento continua recomendada (C.2.1.6).`,
    };
  }

  return {
    TERMINOLOGIA,
    tabelas: {
      ZPR_CLASSES,
      MPS_BASICAS,
      TABELA1_EQUIPOTENCIALIZACAO,
      TABELA_A1_UW,
      CATEGORIAS_PRODUTO_UW,
      SUPORTABILIDADE_SINAL_ETI,
      TABELA_D1_IIMP,
    },
    listarZPR,
    listarMPSBasicas,
    tabela1_secaoMinima,
    tabelaA1_uw,
    tabelaD1_porIimp,
    calc_UpEfetivo_limitador,
    calc_UpEfetivo_comutador,
    calc_deltaU_estimado,
    verificarCondicaoProtecao,
    avisoOscilacaoCircuitoLongo,
  };
})();
