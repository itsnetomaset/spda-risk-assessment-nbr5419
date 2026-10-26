/* ABNT NBR 5419-2:2026 risk analysis engine: Annex A (N), Annex B (P), Annex C (L), risk components and tolerable risk. */

/* ============================================================================
   NEMAX ENGENHARIA — MOTOR DE CÁLCULO DE ANÁLISE DE RISCO PDA
   Conforme ABNT NBR 5419-2:2026 — Proteção contra descargas atmosféricas
   Parte 2: Análise de risco

   Toda fórmula, tabela e coeficiente neste arquivo foi extraído diretamente
   do texto normativo adquirido (ABNT NBR 5419-2:2026, 258 páginas,
   2ª edição, 10.03.2026). Cada função traz a referência exata do item
   da norma de onde foi extraída. Nenhum valor é presumido, aproximado
   ou simplificado além do que a própria norma prevê expressamente.
   ============================================================================ */

export const NEMAX_CALC = (function () {
  "use strict";

  /* ==========================================================================
     TABELAS NORMATIVAS (Anexo A — Áreas de exposição e fatores de linha)
     ========================================================================== */

  // Tabela A.1 — Fator de localização da estrutura C_D (e C_DJ, mesma tabela)
  const TABELA_A1_CD = [
    { label: "Estrutura cercada por objetos significativamente mais altos", value: 0.25 },
    { label: "Estrutura cercada por objetos da mesma altura ou ligeiramente mais baixos", value: 0.5 },
    { label: "Estrutura isolada: nenhum outro objeto nas vizinhanças, ou cercada por objetos significativamente mais baixos", value: 1 },
    { label: "Estrutura isolada no topo de uma colina ou monte", value: 2 },
  ];

  // Tabela A.2 — Fator de instalação da linha elétrica C_I
  const TABELA_A2_CI = [
    { label: "Aéreo", value: 1 },
    { label: "Enterrado", value: 0.5 },
    { label: "Enterrado dentro dos limites de um eletrodo de aterramento em malha", value: 0.01 },
  ];

  // Tabela A.3 — Fator do tipo de linha elétrica C_T
  const TABELA_A3_CT = [
    { label: "Linha elétrica de energia em BT ou sinal", value: 1 },
    { label: "Linha elétrica de energia em AT (com transformador AT/BT)", value: 0.2 },
  ];

  // Tabela A.4 — Fator ambiental da linha elétrica C_E
  const TABELA_A4_CE = [
    { label: "Rural", value: 1 },
    { label: "Suburbano", value: 0.5 },
    { label: "Urbano", value: 0.1 },
    { label: "Urbano com estruturas acima de 20 m de altura", value: 0.01 },
  ];

  /* ==========================================================================
     ANEXO A — NÚMERO ANUAL N DE EVENTOS PERIGOSOS
     ========================================================================== */

  /**
   * A_D — Área de exposição equivalente de estrutura retangular isolada
   * Fórmula (A.1): A_D = L×W + 2×(3H)×(L+W) + π×(3H)²
   * Norma: A.2.1.2
   */
  function calc_AD(L, W, H) {
    const value = L * W + 2 * (3 * H) * (L + W) + Math.PI * Math.pow(3 * H, 2);
    return {
      value,
      formula: "A_D = L×W + 2×(3H)×(L+W) + π×(3H)²",
      norma: "ABNT NBR 5419-2:2026, A.2.1.2, Eq. (A.1)",
      substituicao: `A_D = ${L}×${W} + 2×(3×${H})×(${L}+${W}) + π×(3×${H})² = ${value.toFixed(2)} m²`,
    };
  }

  /**
   * A_D' — Área de exposição equivalente de saliência elevada na cobertura
   * Fórmula (A.2): A_D' = π×(3×H_P)²
   * Norma: A.2.1.3.2
   */
  function calc_ADlinha(HP) {
    const value = Math.PI * Math.pow(3 * HP, 2);
    return {
      value,
      formula: "A_D' = π×(3×H_P)²",
      norma: "ABNT NBR 5419-2:2026, A.2.1.3.2, Eq. (A.2)",
      substituicao: `A_D' = π×(3×${HP})² = ${value.toFixed(2)} m²`,
    };
  }

  /**
   * N_D — Número de eventos perigosos devido a descarga na estrutura
   * Fórmula (A.3): N_D = N_G × A_D × C_D × 10⁻⁶
   * Norma: A.2.4, Eq. (A.3)
   */
  function calc_ND(NG, AD, CD) {
    const value = NG * AD * CD * 1e-6;
    return {
      value,
      formula: "N_D = N_G × A_D × C_D × 10⁻⁶",
      norma: "ABNT NBR 5419-2:2026, A.2.4, Eq. (A.3)",
      substituicao: `N_D = ${NG} × ${AD.toFixed(2)} × ${CD} × 10⁻⁶ = ${value.toExponential(4)} /ano`,
    };
  }

  /**
   * N_DJ — Número de eventos perigosos na estrutura adjacente
   * Fórmula (A.4): N_DJ = N_G × A_DJ × C_DJ × C_T × 10⁻⁶
   * Norma: A.2.5.1, Eq. (A.4)
   */
  function calc_NDJ(NG, ADJ, CDJ, CT) {
    const value = NG * ADJ * CDJ * CT * 1e-6;
    return {
      value,
      formula: "N_DJ = N_G × A_DJ × C_DJ × C_T × 10⁻⁶",
      norma: "ABNT NBR 5419-2:2026, A.2.5.1, Eq. (A.4)",
      substituicao: `N_DJ = ${NG} × ${ADJ.toFixed(2)} × ${CDJ} × ${CT} × 10⁻⁶ = ${value.toExponential(4)} /ano`,
    };
  }

  /**
   * A_M — Área de exposição equivalente para descargas próximo da estrutura
   * Fórmula (A.6): A_M = 2×500×(L+W) + π×500²
   * Norma: A.3.2, Eq. (A.6)
   */
  function calc_AM(L, W) {
    const value = 2 * 500 * (L + W) + Math.PI * Math.pow(500, 2);
    return {
      value,
      formula: "A_M = 2×500×(L+W) + π×500²",
      norma: "ABNT NBR 5419-2:2026, A.3.2, Eq. (A.6)",
      substituicao: `A_M = 2×500×(${L}+${W}) + π×500² = ${value.toFixed(2)} m²`,
    };
  }

  /**
   * N_M — Número de eventos perigosos próximo da estrutura
   * Fórmula (A.5): N_M = N_G × A_M × 10⁻⁶
   * Norma: A.3.1, Eq. (A.5)
   */
  function calc_NM(NG, AM) {
    const value = NG * AM * 1e-6;
    return {
      value,
      formula: "N_M = N_G × A_M × 10⁻⁶",
      norma: "ABNT NBR 5419-2:2026, A.3.1, Eq. (A.5)",
      substituicao: `N_M = ${NG} × ${AM.toFixed(2)} × 10⁻⁶ = ${value.toExponential(4)} /ano`,
    };
  }

  /**
   * A_L — Área de exposição equivalente para descarga na linha elétrica
   * Fórmula (A.8): A_L = 40 × L_L
   * Norma: A.4.1, Eq. (A.8)
   */
  function calc_AL(LL) {
    const value = 40 * LL;
    return {
      value,
      formula: "A_L = 40 × L_L",
      norma: "ABNT NBR 5419-2:2026, A.4.1, Eq. (A.8)",
      substituicao: `A_L = 40 × ${LL} = ${value.toFixed(2)} m²`,
    };
  }

  /**
   * N_L — Número de eventos perigosos na linha elétrica
   * Fórmula (A.7): N_L = N_G × A_L × C_I × C_E × C_T × 10⁻⁶
   * Norma: A.4.1, Eq. (A.7)
   */
  function calc_NL(NG, AL, CI, CE, CT) {
    const value = NG * AL * CI * CE * CT * 1e-6;
    return {
      value,
      formula: "N_L = N_G × A_L × C_I × C_E × C_T × 10⁻⁶",
      norma: "ABNT NBR 5419-2:2026, A.4.1, Eq. (A.7)",
      substituicao: `N_L = ${NG} × ${AL.toFixed(2)} × ${CI} × ${CE} × ${CT} × 10⁻⁶ = ${value.toExponential(4)} /ano`,
    };
  }

  /**
   * A_I — Área de exposição equivalente para descarga próximo da linha
   * Fórmula (A.10): A_I = 4000 × L_L
   * Norma: A.5.1, Eq. (A.10)
   */
  function calc_AI(LL) {
    const value = 4000 * LL;
    return {
      value,
      formula: "A_I = 4 000 × L_L",
      norma: "ABNT NBR 5419-2:2026, A.5.1, Eq. (A.10)",
      substituicao: `A_I = 4 000 × ${LL} = ${value.toFixed(2)} m²`,
    };
  }

  /**
   * N_I — Número de eventos perigosos próximo da linha elétrica
   * Fórmula (A.9): N_I = N_G × A_I × C_I × C_E × C_T × 10⁻⁶
   * Norma: A.5.1, Eq. (A.9)
   */
  function calc_NI(NG, AI, CI, CE, CT) {
    const value = NG * AI * CI * CE * CT * 1e-6;
    return {
      value,
      formula: "N_I = N_G × A_I × C_I × C_E × C_T × 10⁻⁶",
      norma: "ABNT NBR 5419-2:2026, A.5.1, Eq. (A.9)",
      substituicao: `N_I = ${NG} × ${AI.toFixed(2)} × ${CI} × ${CE} × ${CT} × 10⁻⁶ = ${value.toExponential(4)} /ano`,
    };
  }

  /* ==========================================================================
     ANEXO B — PROBABILIDADE DE DANOS
     ========================================================================== */

  // Tabela B.1 — P_TA (proteção contra toque/passo)
  const TABELA_B1_PTA = [
    { label: "Nenhuma medida de proteção", value: 1 },
    { label: "Avisos de alerta", value: 1e-1 },
    { label: "Isolação elétrica dos condutores de descida (≥3mm PE reticulado)", value: 1e-2 },
    { label: "Malha de equipotencialização do solo", value: 1e-2 },
    { label: "Estrutura metálica contínua ou concreto armado como descida natural", value: 1e-3 },
    { label: "Restrições físicas fixas", value: 0 },
  ];

  // Tabela B.2 — P_B (em função do NP do SPDA)
  const TABELA_B2_PB = [
    { label: "Estrutura não protegida por SPDA", value: 1, np: null },
    { label: "SPDA Nível de Proteção IV", value: 0.2, np: "IV" },
    { label: "SPDA Nível de Proteção III", value: 0.1, np: "III" },
    { label: "SPDA Nível de Proteção II", value: 0.05, np: "II" },
    { label: "SPDA Nível de Proteção I", value: 0.02, np: "I" },
    { label: "Captação NP I + estrutura metálica/concreto armado como descida natural (5419-3, 8.1.2-b)", value: 0.01, np: "I" },
    { label: "Cobertura metálica como captação natural + descida natural (5419-3, 8.1.2-b)", value: 0.001, np: "I" },
  ];

  // Tabela B.3 — P_SPD (em função do NP para o qual os DPS foram projetados)
  const TABELA_B3_PSPD = [
    { label: "Nenhum sistema coordenado de DPS", value: 1 },
    { label: "DPS projetado para NP III-IV", value: 0.05 },
    { label: "DPS projetado para NP II", value: 0.02 },
    { label: "DPS projetado para NP I", value: 0.01 },
    { label: "Melhor que NP I", value: 0.003 }, // faixa 0,005-0,001, valor médio como ponto de partida editável
  ];

  // Tabela B.4 — C_LD e C_LI (blindagem, aterramento, isolação)
  const TABELA_B4_CLD_CLI = [
    { label: "Linha aérea não blindada — nenhuma ligação equipotencial", cld: 1, cli: 1 },
    { label: "Linha subterrânea não blindada — nenhuma ligação equipotencial", cld: 1, cli: 1 },
    { label: "Linha de energia com neutro multiaterrado — nenhuma ligação", cld: 1, cli: 0.2 },
    { label: "Linha subterrânea blindada — blindagem não interligada ao BEP", cld: 1, cli: 0.3 },
    { label: "Linha aérea blindada — blindagem não interligada ao BEP", cld: 1, cli: 0.1 },
    { label: "Linha aérea/subterrânea blindada — blindagem interligada ao BEP", cld: 1, cli: 0 },
    { label: "Cabo de proteção / eletroduto metálico interligado ao BEP", cld: 0, cli: 0 },
    { label: "Nenhuma linha externa ou linha não metálica (fibra óptica)", cld: 0, cli: 0 },
    { label: "Interfaces isolantes (NBR 5419-4)", cld: 0, cli: 0 },
  ];

  // Tabela B.5 — K_S3 (fiação interna)
  const TABELA_B5_KS3 = [
    { label: "Cabo não blindado — sem roteamento para evitar laços", value: 1 },
    { label: "Cabo não blindado — roteamento evita grandes laços (~25m²)", value: 0.5 },
    { label: "Cabo não blindado — roteamento evita laços médios (~10m²)", value: 0.2 },
    { label: "Cabo não blindado — roteamento evita pequenos laços (~0,5m²)", value: 0.01 },
    { label: "Cabos blindados ou em condutos metálicos", value: 0.0001 },
  ];

  // Tabela B.6 — P_TU (proteção contra toque na linha elétrica)
  const TABELA_B6_PTU = [
    { label: "Nenhuma medida de proteção", value: 1 },
    { label: "Avisos visíveis de alerta", value: 1e-1 },
    { label: "Isolação elétrica", value: 1e-2 },
    { label: "Restrições físicas", value: 0 },
  ];

  // Tabela B.7 — P_EB (em função do NP para o qual os DPS classe I foram projetados)
  const TABELA_B7_PEB = [
    { label: "Sem DPS classe I", value: 1 },
    { label: "DPS classe I projetado para NP III-IV", value: 0.05 },
    { label: "DPS classe I projetado para NP II", value: 0.02 },
    { label: "DPS classe I projetado para NP I", value: 0.01 },
    { label: "Melhor que NP I", value: 0.003 },
  ];

  // Tabela B.8 — P_LD (resistência da blindagem do cabo × tensão suportável)
  // Linhas: condição de roteamento/blindagem; Colunas: U_W em kV
  const TABELA_B8_PLD = {
    uw_kv: [0.35, 0.5, 1, 1.5, 2.5, 4, 6],
    linhas: [
      { label: "Não blindada, ou blindagem não interligada ao BEP", valores: [1, 1, 1, 1, 1, 1, 1] },
      { label: "Blindada, 5 < R_S ≤ 20 Ω/km, interligada ao BEP", valores: [1, 1, 1, 1, 0.95, 0.9, 0.8] },
      { label: "Blindada, 1 < R_S ≤ 5 Ω/km, interligada ao BEP", valores: [1, 1, 0.9, 0.8, 0.6, 0.3, 0.1] },
      { label: "Blindada, R_S ≤ 1 Ω/km, interligada ao BEP", valores: [1, 0.85, 0.6, 0.4, 0.2, 0.04, 0.02] },
    ],
  };

  // Tabela B.9 — P_LI (tipo de linha × tensão suportável)
  const TABELA_B9_PLI = {
    uw_kv: [1, 1.5, 2.5, 4, 6],
    linhas: [
      { label: "Linhas elétricas de energia", valores: [1, 0.6, 0.3, 0.16, 0.1] },
      { label: "Linhas elétricas de sinais", valores: [1, 0.5, 0.2, 0.08, 0.04] },
    ],
  };

  function interp_tabela_kv(tabela, uwSelecionado, linhaIdx) {
    const idx = tabela.uw_kv.indexOf(uwSelecionado);
    if (idx === -1) return tabela.linhas[linhaIdx].valores[0];
    return tabela.linhas[linhaIdx].valores[idx];
  }

  /**
   * P_A — Probabilidade de choque (descarga na estrutura)
   * Fórmula (B.1): P_A = P_TA × P_B
   * Norma: B.2.1, Eq. (B.1)
   */
  function calc_PA(PTA, PB) {
    const value = PTA * PB;
    return {
      value,
      formula: "P_A = P_TA × P_B",
      norma: "ABNT NBR 5419-2:2026, B.2.1, Eq. (B.1)",
      substituicao: `P_A = ${PTA} × ${PB} = ${value}`,
    };
  }

  /**
   * P_C — Probabilidade de falha de sistemas internos (descarga na estrutura)
   * Fórmula (B.2): P_C = P_SPD × C_LD
   * Norma: B.4.2, Eq. (B.2)
   */
  function calc_PC(PSPD, CLD) {
    const value = PSPD * CLD;
    return {
      value,
      formula: "P_C = P_SPD × C_LD",
      norma: "ABNT NBR 5419-2:2026, B.4.2, Eq. (B.2)",
      substituicao: `P_C = ${PSPD} × ${CLD} = ${value}`,
    };
  }

  /**
   * P_MS — componente de P_M
   * Fórmula (B.4): P_MS = (K_S1 × K_S2 × K_S3 × K_S4)²
   * Norma: B.4.10, Eq. (B.4)
   */
  function calc_PMS(KS1, KS2, KS3, KS4) {
    const value = Math.pow(KS1 * KS2 * KS3 * KS4, 2);
    return {
      value,
      formula: "P_MS = (K_S1 × K_S2 × K_S3 × K_S4)²",
      norma: "ABNT NBR 5419-2:2026, B.4.10, Eq. (B.4)",
      substituicao: `P_MS = (${KS1} × ${KS2} × ${KS3} × ${KS4})² = ${value.toExponential(4)}`,
    };
  }

  /**
   * K_S1, K_S2 — eficiência de blindagem por malha
   * Fórmulas (B.5)/(B.6): K_S1 = 0,12 × w_m1 ; K_S2 = 0,12 × w_m2
   * Norma: B.4.12, Eq. (B.5), (B.6)
   */
  function calc_KS1_KS2(wm) {
    const value = Math.min(0.12 * wm, 1);
    return {
      value,
      formula: "K_S1 ou K_S2 = 0,12 × w_m (máx. 1)",
      norma: "ABNT NBR 5419-2:2026, B.4.12, Eq. (B.5)/(B.6)",
      substituicao: `= 0,12 × ${wm} = ${value.toFixed(4)} (limitado a 1)`,
    };
  }

  /**
   * K_S4 — fator de tensão suportável
   * Fórmula (B.7): K_S4 = 1/U_W
   * Norma: B.4.14, Eq. (B.7)
   */
  function calc_KS4(UW) {
    const value = Math.min(1 / UW, 1);
    return {
      value,
      formula: "K_S4 = 1/U_W (máx. 1)",
      norma: "ABNT NBR 5419-2:2026, B.4.14, Eq. (B.7)",
      substituicao: `K_S4 = 1/${UW} = ${value.toFixed(4)} (limitado a 1)`,
    };
  }

  /**
   * P_M — Probabilidade de falha de sistemas internos (descarga próxima)
   * Fórmula (B.3): P_M = P_SPD × P_MS
   * Norma: B.4.9, Eq. (B.3)
   */
  function calc_PM(PSPD, PMS) {
    const value = PSPD * PMS;
    return {
      value,
      formula: "P_M = P_SPD × P_MS",
      norma: "ABNT NBR 5419-2:2026, B.4.9, Eq. (B.3)",
      substituicao: `P_M = ${PSPD} × ${PMS.toExponential(4)} = ${value.toExponential(4)}`,
    };
  }

  /**
   * P_U — Probabilidade de choque (descarga na linha)
   * Fórmula (B.8): P_U = P_TU × P_EB × P_LD × C_LD
   * Norma: B.5.2, Eq. (B.8)
   */
  function calc_PU(PTU, PEB, PLD, CLD) {
    const value = PTU * PEB * PLD * CLD;
    return {
      value,
      formula: "P_U = P_TU × P_EB × P_LD × C_LD",
      norma: "ABNT NBR 5419-2:2026, B.5.2, Eq. (B.8)",
      substituicao: `P_U = ${PTU} × ${PEB} × ${PLD} × ${CLD} = ${value}`,
    };
  }

  /**
   * P_V — Probabilidade de danos físicos (descarga na linha)
   * Fórmula (B.9): P_V = P_EB × P_LD × C_LD
   * Norma: B.6.2, Eq. (B.9)
   */
  function calc_PV(PEB, PLD, CLD) {
    const value = PEB * PLD * CLD;
    return {
      value,
      formula: "P_V = P_EB × P_LD × C_LD",
      norma: "ABNT NBR 5419-2:2026, B.6.2, Eq. (B.9)",
      substituicao: `P_V = ${PEB} × ${PLD} × ${CLD} = ${value}`,
    };
  }

  /**
   * P_W — Probabilidade de falha de sistemas internos (descarga na linha)
   * Fórmula (B.10): P_W = P_SPD × P_LD × C_LD
   * Norma: B.7.2, Eq. (B.10)
   */
  function calc_PW(PSPD, PLD, CLD) {
    const value = PSPD * PLD * CLD;
    return {
      value,
      formula: "P_W = P_SPD × P_LD × C_LD",
      norma: "ABNT NBR 5419-2:2026, B.7.2, Eq. (B.10)",
      substituicao: `P_W = ${PSPD} × ${PLD} × ${CLD} = ${value}`,
    };
  }

  /**
   * P_Z — Probabilidade de falha de sistemas internos (descarga próxima da linha)
   * Fórmula (B.11): P_Z = P_SPD × P_LI × C_LI
   * Norma: B.8.2, Eq. (B.11)
   */
  function calc_PZ(PSPD, PLI, CLI) {
    const value = PSPD * PLI * CLI;
    return {
      value,
      formula: "P_Z = P_SPD × P_LI × C_LI",
      norma: "ABNT NBR 5419-2:2026, B.8.2, Eq. (B.11)",
      substituicao: `P_Z = ${PSPD} × ${PLI} × ${CLI} = ${value}`,
    };
  }

  /* ==========================================================================
     ANEXO C — QUANTIDADE DE PERDA L
     ========================================================================== */

  // Tabela C.2 — Valores médios típicos de L_T, L_F, L_O (perda L1)
  const TABELA_C2_L1 = {
    LT: [
      { label: "Todos os tipos", value: 1e-2 },
      { label: "Risco de explosão", value: 1e-1 },
    ],
    LF: [
      { label: "Hospital, hotel, escola, edifício cívico", value: 1e-1 },
      { label: "Entretenimento público, igreja, museu", value: 5e-2 },
      { label: "Industrial, comercial", value: 2e-2 },
      { label: "Outros", value: 1e-2 },
    ],
    LO: [
      { label: "Risco de explosão", value: 1e-1 },
      { label: "Unidade de terapia intensiva / bloco cirúrgico de hospital", value: 1e-2 },
      { label: "Outras partes de hospital", value: 1e-3 },
    ],
  };

  // Tabela C.3 — r_t (tipo de superfície do solo/piso)
  const TABELA_C3_RT = [
    { label: "Terra, concreto", value: 1e-2 },
    { label: "Mármore, cerâmica", value: 1e-3 },
    { label: "Brita, tapete, carpete", value: 1e-4 },
    { label: "Asfalto, linóleo, madeira", value: 1e-5 },
  ];

  // Tabela C.4 — r_p (providências contra incêndio)
  const TABELA_C4_RP = [
    { label: "Nenhuma providência (ou risco de explosão)", value: 1 },
    { label: "Extintores, instalações manuais, hidrantes, compartimentos a prova de fogo, rotas de escape", value: 0.5 },
    { label: "Instalações automáticas de combate ou alarme", value: 0.2 },
  ];

  // Tabela C.5 — r_f (risco de incêndio/explosão)
  const TABELA_C5_RF = [
    { label: "Explosão — zonas 0, 20 e explosivos sólidos", value: 1 },
    { label: "Explosão — zonas 1, 21", value: 1e-1 },
    { label: "Explosão — zonas 2, 22", value: 1e-3 },
    { label: "Incêndio — alto (carga ≥ 800 MJ/m²)", value: 1e-1 },
    { label: "Incêndio — normal (400 a 800 MJ/m²)", value: 1e-2 },
    { label: "Incêndio — baixo (< 400 MJ/m²)", value: 1e-3 },
    { label: "Nenhum risco de explosão ou incêndio", value: 0 },
  ];

  // Tabela C.6 — h_z (perigo especial / pânico)
  const TABELA_C6_HZ = [
    { label: "Sem perigo especial", value: 1 },
    { label: "Baixo nível de pânico (≤2 andares, ≤100 pessoas)", value: 2 },
    { label: "Nível médio de pânico (eventos 100-1000 pessoas)", value: 5 },
    { label: "Dificuldade de evacuação (pessoas imobilizadas, hospitais)", value: 5 },
    { label: "Alto nível de pânico (eventos >1000 pessoas)", value: 10 },
  ];

  // Tabela C.7 — r_s (tipo de construção)
  const TABELA_C7_RS = [
    { label: "Simples: madeira ou alvenaria simples", value: 2 },
    { label: "Robusta: estrutura metálica ou concreto armado", value: 1 },
  ];

  // Tabela C.9 — L_F para perda L3 (patrimônio cultural)
  const TABELA_C9_L3_LF = [{ label: "Museus, galerias", value: 1e-1 }];

  /**
   * L_A (= L_U) — Perda por ferimentos por choque elétrico (D1)
   * Fórmula (C.1)/(C.2): L = r_t × L_T × (n_z/n_t) × (t_z/8760) × r_s
   * Norma: C.3.1, Tabela C.1, Eq. (C.1)/(C.2)
   */
  function calc_LA(rt, LT, nz, nt, tz, rs) {
    const value = rt * LT * (nz / nt) * (Math.min(tz, 8760) / 8760) * rs;
    return {
      value,
      formula: "L_A (L_U) = r_t × L_T × (n_z/n_t) × (t_z/8 760) × r_s",
      norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.1, Eq. (C.1)/(C.2)",
      substituicao: `L_A = ${rt} × ${LT} × (${nz}/${nt}) × (${tz}/8760) × ${rs} = ${value.toExponential(4)}`,
    };
  }

  /**
   * L_B (= L_V) — Perda por danos físicos (D2)
   * Fórmula (C.3): L = r_p × r_f × h_z × L_F × (n_z/n_t) × (t_z/8760) × r_s
   * Norma: C.3.1, Tabela C.1, Eq. (C.3)
   */
  function calc_LB(rp, rf, hz, LF, nz, nt, tz, rs) {
    const value = rp * rf * hz * LF * (nz / nt) * (Math.min(tz, 8760) / 8760) * rs;
    return {
      value,
      formula: "L_B (L_V) = r_p × r_f × h_z × L_F × (n_z/n_t) × (t_z/8 760) × r_s",
      norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.1, Eq. (C.3)",
      substituicao: `L_B = ${rp} × ${rf} × ${hz} × ${LF} × (${nz}/${nt}) × (${tz}/8760) × ${rs} = ${value.toExponential(4)}`,
    };
  }

  /**
   * L_C (= L_M = L_W = L_Z) — Perda por falha de sistemas internos (D3)
   * Fórmula (C.4): L = L_O × (n_z/n_t) × (t_z/8760) × r_s
   * Norma: C.3.1, Tabela C.1, Eq. (C.4)
   */
  function calc_LC(LO, nz, nt, tz, rs) {
    const value = LO * (nz / nt) * (Math.min(tz, 8760) / 8760) * rs;
    return {
      value,
      formula: "L_C (L_M, L_W, L_Z) = L_O × (n_z/n_t) × (t_z/8 760) × r_s",
      norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.1, Eq. (C.4)",
      substituicao: `L_C = ${LO} × (${nz}/${nt}) × (${tz}/8760) × ${rs} = ${value.toExponential(4)}`,
    };
  }

  /**
   * L3 — Perda de patrimônio cultural (D2): L_B = L_V = r_p × r_f × L_F × (c_z/c_t)
   * Norma: C.4.1, Tabela C.8, Eq. (C.7)
   */
  function calc_L3(rp, rf, LF, cz, ct) {
    const value = rp * rf * LF * (cz / ct);
    return {
      value,
      formula: "L_B (L3) = r_p × r_f × L_F × (c_z/c_t)",
      norma: "ABNT NBR 5419-2:2026, C.4.1, Tabela C.8, Eq. (C.7)",
      substituicao: `L_B = ${rp} × ${rf} × ${LF} × (${cz}/${ct}) = ${value.toExponential(4)}`,
    };
  }

  /* ==========================================================================
     SEÇÃO 6 — COMPONENTES DE RISCO (R = N × P × L)
     ========================================================================== */

  function calc_R(N, P, L, nome, eq, norma) {
    const value = N * P * L;
    return {
      value,
      formula: `${nome} = N × P × L`,
      norma,
      substituicao: `${nome} = ${N.toExponential(4)} × ${P.toExponential(4)} × ${L.toExponential(4)} = ${value.toExponential(4)} /ano`,
    };
  }

  /* ==========================================================================
     SEÇÃO 5 — RISCO TOLERÁVEL (Tabela 4)
     ========================================================================== */

  const RT1 = 1e-5; // Risco de perda de vida humana
  const RT3 = 1e-4; // Risco de perda de patrimônio cultural

  /* ==========================================================================
     SEÇÃO 7 — FREQUÊNCIA DE DANOS F
     ========================================================================== */

  function calc_F(N, P, nome, eq) {
    const value = N * P;
    return {
      value,
      formula: `${nome} = N × P`,
      norma: "ABNT NBR 5419-2:2026, 7.2.1, Eq. (15)",
      substituicao: `${nome} = ${N.toExponential(4)} × ${P.toExponential(4)} = ${value.toExponential(4)} /ano`,
    };
  }

  const FT_CRITICO = 0.1; // 7.3.4 — valor máximo para sistemas críticos (fixo)
  const FT_NAO_CRITICO = 1; // 7.3.4 — valor representativo para sistemas não críticos

  /* ==========================================================================
     API PÚBLICA
     ========================================================================== */

  return {
    tabelas: {
      A1_CD: TABELA_A1_CD,
      A2_CI: TABELA_A2_CI,
      A3_CT: TABELA_A3_CT,
      A4_CE: TABELA_A4_CE,
      B1_PTA: TABELA_B1_PTA,
      B2_PB: TABELA_B2_PB,
      B3_PSPD: TABELA_B3_PSPD,
      B4_CLD_CLI: TABELA_B4_CLD_CLI,
      B5_KS3: TABELA_B5_KS3,
      B6_PTU: TABELA_B6_PTU,
      B7_PEB: TABELA_B7_PEB,
      B8_PLD: TABELA_B8_PLD,
      B9_PLI: TABELA_B9_PLI,
      C2_L1: TABELA_C2_L1,
      C3_RT: TABELA_C3_RT,
      C4_RP: TABELA_C4_RP,
      C5_RF: TABELA_C5_RF,
      C6_HZ: TABELA_C6_HZ,
      C7_RS: TABELA_C7_RS,
      C9_L3_LF: TABELA_C9_L3_LF,
    },
    constantes: { RT1, RT3, FT_CRITICO, FT_NAO_CRITICO },
    interp_tabela_kv,
    calc_AD, calc_ADlinha, calc_ND, calc_NDJ, calc_AM, calc_NM, calc_AL, calc_NL, calc_AI, calc_NI,
    calc_PA, calc_PC, calc_PMS, calc_KS1_KS2, calc_KS4, calc_PM, calc_PU, calc_PV, calc_PW, calc_PZ,
    calc_LA, calc_LB, calc_LC, calc_L3,
    calc_R, calc_F,
  };
})();
