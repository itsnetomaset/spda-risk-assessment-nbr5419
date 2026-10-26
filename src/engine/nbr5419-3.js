/* ABNT NBR 5419-3:2026 physical SPDA sizing engine: protection angle, earth electrode, down conductors, separation distance and kc (Annex C). */

/* ============================================================================
   NEMAX ENGENHARIA — MOTOR DE CÁLCULO DE DIMENSIONAMENTO FÍSICO DE SPDA
   Conforme ABNT NBR 5419-3:2026 — Proteção contra descargas atmosféricas
   Parte 3: Danos físicos a estruturas e perigos à vida

   Toda fórmula, tabela e coeficiente neste arquivo foi extraído diretamente
   do texto normativo adquirido (ABNT NBR 5419-3:2026, 87 páginas,
   2ª edição, 10.03.2026). Cada função traz a referência exata do item
   da norma de onde foi extraída. Nenhum valor é presumido, aproximado
   ou simplificado além do que a própria norma prevê expressamente.

   As Figuras 1 e 3 (gráficas, sem equação fechada para todo o domínio)
   foram digitalizadas a partir dos vetores de desenho do PDF original
   (extração geométrica direta, não leitura visual aproximada), com
   reconstrução conferida contra a imagem da norma. A Figura 3 (eletrodo)
   usa as equações oficiais (1a, 1b) fornecidas pela própria norma para
   extrapolação, confirmadas como válidas em todo o domínio do gráfico
   por comparação com os pontos de início e fim das retas extraídas.

   Os casos do Anexo C sem fórmula fechada (impacto em descida de
   extremidade com 3 descidas — Fig. C.6 —, captação em malha — Fig. C.8 —,
   e anéis intermediários — Fig. C.9) são procedimentos gráficos/algorítmicos
   manuais na própria norma, não generalizáveis em equação única. Para esses
   casos o sistema expõe a equação geral de "s" (6.3.1.2) para que o
   profissional insira o kc obtido pelo procedimento normativo aplicável,
   em vez de aproximar ou inventar uma fórmula que a norma não fornece.
   ============================================================================ */

export const NEMAX_CALC_P3 = (function () {
  "use strict";

  /* ==========================================================================
     TABELA 2 — Raio da esfera rolante, módulo de malha e ângulo de proteção
     Norma: 5.3.2.9, Tabela 2
     ========================================================================== */
  const TABELA2_NP = {
    I:   { raioEsfera: 20, malha: 5,  malhaLabel: "5 × 5" },
    II:  { raioEsfera: 30, malha: 10, malhaLabel: "10 × 10" },
    III: { raioEsfera: 45, malha: 15, malhaLabel: "15 × 15" },
    IV:  { raioEsfera: 60, malha: 20, malhaLabel: "20 × 20" },
  };

  /* ==========================================================================
     TABELA 5 — Distância entre condutores de descida / anéis intermediários
     Norma: 5.4.3.1, Tabela 5
     ========================================================================== */
  const TABELA5_DIST_DESCIDA = { I: 10, II: 10, III: 15, IV: 20 };

  /* ==========================================================================
     TABELA 11 / 12 / 13 — Coeficientes de isolação do SPDA externo
     Norma: 6.3.1.2 (Tabelas 11, 12) e 6.3.2 (Tabela 13)
     ========================================================================== */
  const TABELA11_KI = { I: 0.08, II: 0.06, III: 0.04, IV: 0.04 };
  const TABELA12_KM = { ar: 1, solido: 0.5 };

  function tabela13_kc(numDescidas) {
    if (numDescidas <= 1) return { value: 1, condicao: "1 (somente para SPDA isolado)", norma: "ABNT NBR 5419-3:2026, 6.3.2, Tabela 13" };
    if (numDescidas === 2) return { value: 0.66, condicao: "2", norma: "ABNT NBR 5419-3:2026, 6.3.2, Tabela 13" };
    return { value: 0.44, condicao: "3 ou mais", norma: "ABNT NBR 5419-3:2026, 6.3.2, Tabela 13" };
  }

  /* ==========================================================================
     TABELA 3 — Espessura mínima de chapas/tubulações metálicas (captação)
     Norma: 5.3.2.16.1.1, Tabela 3
     ========================================================================== */
  const TABELA3_ESPESSURAS = [
    { material: "Chumbo", t: null, tLinha: 2.0 },
    { material: "Aço (inoxidável, zincado a quente)", t: 4, tLinha: 0.5 },
    { material: "Titânio", t: 4, tLinha: 0.5 },
    { material: "Cobre", t: 5, tLinha: 0.5 },
    { material: "Alumínio", t: 7, tLinha: 0.65 },
    { material: "Zinco", t: null, tLinha: 0.7 },
  ];

  /* ==========================================================================
     TABELA 7 — Seção mínima dos condutores de captação/descida não naturais
     Norma: 5.7.2.1, Tabela 7
     ========================================================================== */
  const TABELA7_CONDUTORES = [
    { material: "Cobre", config: "Fita maciça", secaoMM2: 35, dimensao: "Espessura 1,75 mm" },
    { material: "Cobre", config: "Cilíndrico maciço", secaoMM2: 35, dimensao: "Diâmetro 6,7 mm" },
    { material: "Cobre", config: "Encordoado (7 fios)", secaoMM2: 35, dimensao: "—" },
    { material: "Cobre", config: "Captor vertical maciço", secaoMM2: 200, dimensao: "Diâmetro 16,0 mm" },
    { material: "Cobre", config: "Captor vertical tubular", secaoMM2: 100, dimensao: "Espessura 1,2 mm" },
    { material: "Alumínio", config: "Fita maciça", secaoMM2: 70, dimensao: "Espessura 3,0 mm" },
    { material: "Alumínio", config: "Cilíndrico maciço", secaoMM2: 70, dimensao: "Diâmetro 9,5 mm" },
    { material: "Alumínio", config: "Captor vertical maciço", secaoMM2: 200, dimensao: "Diâmetro 16,0 mm" },
    { material: "Aço cobreado", config: "Cilíndrico maciço", secaoMM2: 35, dimensao: "Diâmetro 6,7 mm" },
    { material: "Aço cobreado", config: "Captor vertical maciço", secaoMM2: 200, dimensao: "Diâmetro 16,0 mm" },
    { material: "Aço zincado a quente", config: "Fita maciça", secaoMM2: 50, dimensao: "Espessura 2,5 mm" },
    { material: "Aço zincado a quente", config: "Cilíndrico maciço", secaoMM2: 50, dimensao: "Diâmetro 8,0 mm" },
    { material: "Aço zincado a quente", config: "Captor vertical maciço", secaoMM2: 200, dimensao: "Diâmetro 16,0 mm" },
    { material: "Aço inoxidável (AISI 304+)", config: "Fita maciça", secaoMM2: 50, dimensao: "Espessura 2,5 mm" },
    { material: "Aço inoxidável (AISI 304+)", config: "Cilíndrico maciço", secaoMM2: 50, dimensao: "Diâmetro 8,0 mm" },
    { material: "Aço inoxidável (AISI 304+)", config: "Captor vertical maciço", secaoMM2: 200, dimensao: "Diâmetro 16,0 mm" },
  ];

  /* ==========================================================================
     TABELA 8 — Dimensões mínimas de eletrodo de aterramento não natural
     Norma: 5.7.2.2, Tabela 8
     ========================================================================== */
  const TABELA8_ELETRODOS = [
    { material: "Cobre", config: "Encordoado (cabo)", naoCravadoMM2: 50, cravado: "—", espessura: "—" },
    { material: "Cobre", config: "Cilíndrico maciço", naoCravadoMM2: 50, cravado: "15 mm", espessura: "—" },
    { material: "Cobre", config: "Fita maciça (barra chata)", naoCravadoMM2: 50, cravado: "—", espessura: "2 mm" },
    { material: "Aço zincado a quente", config: "Cilíndrico maciço", naoCravadoMM2: 78, cravado: "14 mm", espessura: "—" },
    { material: "Aço zincado a quente", config: "Perfil L (cantoneira)", naoCravadoMM2: null, cravado: "290 mm²", espessura: "3 mm" },
    { material: "Aço zincado a quente", config: "Fita maciça", naoCravadoMM2: 90, cravado: "—", espessura: "3 mm" },
    { material: "Aço zincado a quente", config: "Encordoado", naoCravadoMM2: 74, cravado: "—", espessura: "—" },
    { material: "Aço cobreado", config: "Cilíndrico maciço", naoCravadoMM2: null, cravado: "12,7 mm", espessura: "—" },
    { material: "Aço cobreado", config: "Encordoado", naoCravadoMM2: 50, cravado: "—", espessura: "—" },
    { material: "Aço inoxidável", config: "Cilíndrico maciço", naoCravadoMM2: null, cravado: "15 mm", espessura: "—" },
    { material: "Aço inoxidável", config: "Fita maciça", naoCravadoMM2: 100, cravado: "—", espessura: "3 mm" },
  ];

  /* ==========================================================================
     TABELA 9 / 10 — Seções mínimas de condutores de equipotencialização
     Norma: 6.2.2.4 (Tabela 9) e 6.2.2.7 (Tabela 10)
     ========================================================================== */
  const TABELA9_EQUIPOTENCIAL_BARRAS = { cobre: 16, acoCobreado: 16, aluminio: 25, acoZincado: 50 };
  const TABELA10_EQUIPOTENCIAL_INTERNAS = { cobre: 6, aluminio: 10, acoZincado: 16 };

  /* ==========================================================================
     FIGURA 1 — Ângulo de proteção α em função de H e do NP
     Norma: 5.3.2.8 a 5.3.2.13, Figura 1, Tabela 2

     Pontos digitalizados diretamente dos vetores de desenho (polilinhas) do
     PDF original da norma, calibrados pelos rótulos numéricos dos eixos.
     Reconstrução conferida visualmente contra a Figura 1 do documento.
     Interpolação linear entre os vértices reais da curva (que já é, ela
     mesma, desenhada como polígono de poucos segmentos retos no PDF original
     — não há perda de fidelidade na interpolação entre esses pontos).
     Acima do H máximo de cada NP (= raio da esfera rolante, Tabela 2),
     apenas os métodos da esfera rolante e das malhas são aplicáveis (5.3.2.11).
     ========================================================================== */
  const FIGURA1_PONTOS = {
    I:   [[2.0, 68.15], [8.11, 49.71], [19.51, 23.37], [20.1, 22.03]],
    II:  [[2.0, 71.85], [8.9, 55.55], [25.87, 28.81], [27.25, 26.48], [30.19, 22.55]],
    III: [[2.0, 75.58], [3.1, 74.03], [14.44, 54.51], [15.42, 53.23], [16.44, 51.92], [17.49, 50.59],
          [30.8, 35.83], [32.01, 34.31], [33.27, 33.1], [34.51, 31.61], [43.38, 23.76], [43.94, 23.26], [44.71, 22.56]],
    IV:  [[2.0, 77.98], [3.46, 75.81], [8.38, 66.79], [16.12, 56.7], [16.54, 56.25], [16.97, 55.81],
          [17.42, 55.33], [17.89, 54.86], [29.36, 45.28], [30.31, 44.26], [31.31, 43.47], [32.3, 42.42],
          [52.44, 27.84], [55.02, 25.99], [57.62, 24.1], [60.22, 22.24]],
  };

  function calc_anguloProtecao(NP, H) {
    const pontos = FIGURA1_PONTOS[NP];
    const Hmax = TABELA2_NP[NP].raioEsfera;
    if (H == null || isNaN(H) || H <= 0) {
      return {
        value: null, aplicavel: false,
        formula: "α = f(H, NP) — Figura 1",
        norma: "ABNT NBR 5419-3:2026, 5.3.2.8 a 5.3.2.13, Figura 1",
        substituicao: "Altura H não informada.",
      };
    }
    if (H > Hmax) {
      return {
        value: null, aplicavel: false,
        formula: "α = f(H, NP) — Figura 1",
        norma: "ABNT NBR 5419-3:2026, 5.3.2.11",
        substituicao: `H = ${H} m excede o limite de aplicação do método do ângulo de proteção para NP ${NP} (H_máx = ${Hmax} m, igual ao raio da esfera rolante — Tabela 2). Conforme 5.3.2.11, apenas os métodos da esfera rolante e das malhas podem ser aplicados.`,
      };
    }
    const Heff = Math.max(2, H); // 5.3.2.13: ângulo não se altera para H < 2 m
    let alfa;
    // interpolação linear por trechos entre os vértices reais digitalizados da curva
    if (Heff <= pontos[0][0]) {
      alfa = pontos[0][1];
    } else {
      // Acima do último vértice digitalizado (só ocorre no NP III, entre
      // 44,71 m e H_máx = 45 m) prolonga-se o último trecho da curva.
      let lo = pontos[pontos.length - 2], hi = pontos[pontos.length - 1];
      for (let i = 0; i < pontos.length - 1; i++) {
        if (Heff >= pontos[i][0] && Heff <= pontos[i + 1][0]) {
          lo = pontos[i]; hi = pontos[i + 1];
          break;
        }
      }
      alfa = lo[1] + (hi[1] - lo[1]) * ((Heff - lo[0]) / (hi[0] - lo[0]));
    }
    const raioBase = H * Math.tan(alfa * Math.PI / 180);
    return {
      value: alfa,
      raioProtecaoBase: raioBase,
      aplicavel: true,
      formula: "α = f(H, NP) — curva digitalizada da Figura 1; r = H × tan(α)",
      norma: "ABNT NBR 5419-3:2026, 5.3.2.8 a 5.3.2.13, Figura 1, Anexo A.1.2",
      substituicao: `Para NP ${NP} e H = ${H} m (H efetivo = ${Heff.toFixed(2)} m — 5.3.2.13): α ≈ ${alfa.toFixed(1)}°. Raio de proteção na base do cone = H × tan(α) = ${H} × tan(${alfa.toFixed(1)}°) = ${raioBase.toFixed(2)} m.`,
    };
  }

  /* ==========================================================================
     FIGURA 3 — Comprimento mínimo l1 do eletrodo de aterramento
     Norma: 5.5.2.3, 5.5.2.4, Figura 3, Equações (1), (1a), (1b)

     NP III-IV: l1 = 0 (independente da resistividade do solo — NOTA 1 da Fig. 3)
     NP I:   l1 = max(0; 0,03×ρ − 10)  [Eq. 1a, válida em todo o domínio —
             confirmada por digitalização vetorial do ponto de início e fim
             da reta no gráfico original]
     NP II:  l1 = max(0; 0,02×ρ − 11)  [Eq. 1b, mesma confirmação]
     ========================================================================== */
  function calc_comprimentoMinEletrodo(NP, rhoSolo) {
    if (rhoSolo == null || isNaN(rhoSolo) || rhoSolo < 0) {
      return {
        value: null,
        formula: "l1 = f(ρ, NP) — Figura 3",
        norma: "ABNT NBR 5419-3:2026, 5.5.2.3, Figura 3",
        substituicao: "Resistividade do solo (ρ) não informada.",
      };
    }
    let value, formula, eq, substDetalhe;
    if (NP === "III" || NP === "IV") {
      value = 0;
      formula = "l1 = 0 (independente da resistividade do solo)";
      eq = "Figura 3, NOTA 1";
      substDetalhe = "l1 = 0 m (Níveis III-IV)";
    } else if (NP === "I") {
      value = Math.max(0, 0.03 * rhoSolo - 10);
      formula = "l1 = máx(0; 0,03×ρ − 10)";
      eq = "Figura 3, Equação (1a)";
      substDetalhe = `máx(0; 0,03×${rhoSolo} − 10) = ${value.toFixed(2)} m`;
    } else { // II
      value = Math.max(0, 0.02 * rhoSolo - 11);
      formula = "l1 = máx(0; 0,02×ρ − 11)";
      eq = "Figura 3, Equação (1b)";
      substDetalhe = `máx(0; 0,02×${rhoSolo} − 11) = ${value.toFixed(2)} m`;
    }
    return {
      value,
      formula,
      norma: `ABNT NBR 5419-3:2026, 5.5.2.3, ${eq}`,
      substituicao: `Para NP ${NP} e ρ = ${rhoSolo} Ω·m: ${substDetalhe}`,
    };
  }

  function calc_raioEquivalenteEletrodo(area) {
    const value = Math.sqrt(area / Math.PI);
    return {
      value,
      formula: "r_e = √(área / π)",
      norma: "ABNT NBR 5419-3:2026, 5.5.2.3, Equação (1)",
      substituicao: `r_e = √(${area.toFixed(2)} / π) = ${value.toFixed(2)} m`,
    };
  }

  function calc_dispensaComplementacao(re, l1) {
    const dispensa = re >= l1;
    return {
      value: dispensa,
      formula: "dispensa de complementação se r_e ≥ l1",
      norma: "ABNT NBR 5419-3:2026, 5.5.2.3, Equação (1)",
      substituicao: `r_e = ${re.toFixed(2)} m ${dispensa ? "≥" : "<"} l1 = ${l1.toFixed(2)} m → complementação do eletrodo ${dispensa ? "DISPENSADA" : "NECESSÁRIA"}.`,
    };
  }

  function calc_eletrodoComplementar(re, l1) {
    const lr = Math.max(0, l1 - re);
    const lv = lr / 2;
    return {
      lr: {
        value: lr,
        formula: "lr = l1 − re (eletrodo radial)",
        norma: "ABNT NBR 5419-3:2026, 5.5.2.4-b), Equação (2)",
        substituicao: `lr = ${l1.toFixed(2)} − ${re.toFixed(2)} = ${lr.toFixed(2)} m, por condutor de descida (eletrodos radiais)`,
      },
      lv: {
        value: lv,
        formula: "lv = (l1 − re) / 2 (eletrodo vertical)",
        norma: "ABNT NBR 5419-3:2026, 5.5.2.4-b), Equação (3)",
        substituicao: `lv = (${l1.toFixed(2)} − ${re.toFixed(2)}) / 2 = ${lv.toFixed(2)} m, por condutor de descida (eletrodos verticais)`,
      },
    };
  }

  /* ==========================================================================
     5.4.3 — Número mínimo de condutores de descida (SPDA não isolado)
     Norma: 5.4.3.1, Tabela 5
     ========================================================================== */
  function calc_numeroMinDescidas(perimetro, NP) {
    const distancia = TABELA5_DIST_DESCIDA[NP];
    const bruto = perimetro / distancia;
    const value = Math.max(2, Math.ceil(bruto));
    return {
      value,
      distanciaTabela: distancia,
      formula: "n = máx(2; ⌈perímetro / distância_Tabela5⌉)",
      norma: "ABNT NBR 5419-3:2026, 5.4.3.1, Tabela 5",
      substituicao: `n = máx(2; ⌈${perimetro.toFixed(2)} / ${distancia}⌉) = máx(2; ${Math.ceil(bruto)}) = ${value} condutores de descida (distância nominal entre descidas para NP ${NP} = ${distancia} m)`,
    };
  }

  function calc_espacamentoReal(perimetro, numDescidas) {
    const value = perimetro / numDescidas;
    return {
      value,
      formula: "espaçamento real = perímetro / n",
      norma: "ABNT NBR 5419-3:2026, 5.4.3.1 a 5.4.3.3",
      substituicao: `espaçamento real = ${perimetro.toFixed(2)} / ${numDescidas} = ${value.toFixed(2)} m por condutor de descida (tolerância de até +20 % sobre o valor da Tabela 5 é permitida, desde que o número de descidas calculado não seja diminuído — 5.4.3.3)`,
    };
  }

  /* ==========================================================================
     ANEXO C — Coeficiente kc (casos com fórmula fechada)
     Norma: Anexo C, C.3.1 a C.3.4
     ========================================================================== */
  function calc_kc_umaDescida() {
    return {
      value: 1,
      formula: "kc = 1 (100 % da corrente passa por l — SPDA isolado, uma única descida)",
      norma: "ABNT NBR 5419-3:2026, Anexo C, C.3.1, Figura C.3",
      substituicao: "kc = 1 — válido apenas para SPDA externo isolado com um único condutor de descida.",
    };
  }

  function calc_kc_duasDescidas(h, c) {
    const value = (h + c) / (2 * h + c);
    return {
      value,
      formula: "kc = (h + c) / (2h + c)",
      norma: "ABNT NBR 5419-3:2026, Anexo C, C.3.2, Figura C.4",
      substituicao: `kc = (${h} + ${c}) / (2×${h} + ${c}) = ${value.toFixed(3)}`,
    };
  }

  function calc_kc_tresDescidasCentral(h, c) {
    const value = (h + c) / (3 * h + c);
    return {
      value,
      formula: "kc = (h + c) / (3h + c) — ponto de impacto na descida central",
      norma: "ABNT NBR 5419-3:2026, Anexo C, C.3.3, Figura C.5",
      substituicao: `kc = (${h} + ${c}) / (3×${h} + ${c}) = ${value.toFixed(3)}`,
    };
  }

  function calc_kc_multiplasDescidas(n, c, h) {
    if (n < 4) {
      return {
        value: null, aplicavel: false,
        formula: "kc = 1/(2n) + 0,1 + 0,2×∛(c/h)",
        norma: "ABNT NBR 5419-3:2026, Anexo C, C.3.4, Figura C.7, C.3.4.1",
        substituicao: `Fórmula válida apenas para n ≥ 4 condutores de descida (informado: n = ${n}). Para 1, 2 ou 3 descidas, use os casos específicos (Figuras C.3 a C.6).`,
      };
    }
    const cFora = c < 3 || c > 20;
    const hFora = h < 3 || h > 20;
    const value = 1 / (2 * n) + 0.1 + 0.2 * Math.cbrt(c / h);
    return {
      value, aplicavel: true,
      avisoFaixa: cFora || hFora,
      formula: "kc = 1/(2n) + 0,1 + 0,2×∛(c/h)",
      norma: "ABNT NBR 5419-3:2026, Anexo C, C.3.4, Figura C.7, C.3.4.1",
      substituicao: `kc = 1/(2×${n}) + 0,1 + 0,2×∛(${c}/${h}) = ${value.toFixed(3)}${(cFora || hFora) ? " — ATENÇÃO: a norma assume h e c entre 3 m e 20 m (C.3.4.1); valor(es) informado(s) fora dessa faixa, resultado é aproximação extrapolada." : ""} (aproximação para estruturas cúbicas, n ≥ 4 — C.3.4.1)`,
    };
  }

  /* ==========================================================================
     6.3.1 / 6.3.2 — Distância de segurança "s"
     Norma: 6.3.1.2 (Equação 4, completa) e 6.3.2 (Equação 5, simplificada)
     ========================================================================== */
  function calc_distanciaSeguranca_simplificada(NP, meio, kc, l) {
    const ki = TABELA11_KI[NP];
    const km = TABELA12_KM[meio];
    const value = (ki / km) * kc * l;
    return {
      value,
      formula: "s = (ki / km) × kc × l",
      norma: "ABNT NBR 5419-3:2026, 6.3.2, Equação (5)",
      substituicao: `s = (${ki} / ${km}) × ${kc.toFixed(3)} × ${l} = ${value.toFixed(3)} m`,
      ki, km, kc, l,
    };
  }

  function calc_distanciaSeguranca_completa(NP, meio, termos) {
    // termos: array de {kc, l} — soma de kc_i × l_i para cada trecho
    const ki = TABELA11_KI[NP];
    const km = TABELA12_KM[meio];
    const soma = termos.reduce((acc, t) => acc + t.kc * t.l, 0);
    const value = (ki / km) * soma;
    const termosTexto = termos.map((t, i) => `kc${i + 1}×l${i + 1} (${t.kc.toFixed(3)}×${t.l})`).join(" + ");
    return {
      value,
      formula: "s = (ki / km) × (kc1×l1 + kc2×l2 + ... + kcn×ln)",
      norma: "ABNT NBR 5419-3:2026, 6.3.1.2, Equação (4)",
      substituicao: `s = (${ki} / ${km}) × [${termosTexto}] = (${ki} / ${km}) × ${soma.toFixed(3)} = ${value.toFixed(3)} m`,
      ki, km, soma,
    };
  }

  /* ==========================================================================
     ANEXO B — Seção mínima da blindagem da linha elétrica
     Norma: B.2, Equação sem número (Scmín), e B.4 (limites de corrente)
     ========================================================================== */
  function calc_secaoMinBlindagem(IF, rhoC, Lc, Uw) {
    // Scmín (mm²) = (IF × rhoC × Lc × 10^6) / Uw
    // IF em kA, rhoC em Ω·m, Lc em m, Uw em kV -> Scmín em mm²
    const value = (IF * rhoC * Lc * 1e6) / Uw;
    return {
      value,
      formula: "Scmín = (IF × ρc × Lc × 10⁶) / Uw",
      norma: "ABNT NBR 5419-3:2026, Anexo B, B.2",
      substituicao: `Scmín = (${IF} × ${rhoC} × ${Lc} × 10⁶) / ${Uw} = ${value.toFixed(2)} mm²`,
    };
  }

  function calc_comprimentoLinhaBlindagem_aterrada(rhoSolo) {
    const value = 8 * Math.sqrt(rhoSolo);
    return {
      value,
      formula: "Lc ≤ 8×√ρ (blindagem em contato com o solo)",
      norma: "ABNT NBR 5419-3:2026, Anexo B, Tabela B.1",
      substituicao: `Lc ≤ 8×√${rhoSolo} = ${value.toFixed(2)} m`,
    };
  }

  function calc_correnteLimiteBlindagemCobre(Sc) {
    const value = 8 * Sc;
    return {
      value,
      formula: "IF = 8 × Sc (limite de elevação de temperatura aceitável — blindagem em cobre)",
      norma: "ABNT NBR 5419-3:2026, Anexo B, B.4-a)",
      substituicao: `IF = 8 × ${Sc} = ${value.toFixed(2)} kA`,
    };
  }

  function calc_correnteLimiteCondutoresNaoBlindados(nLinhas, ScCadaUm) {
    const value = 8 * nLinhas * ScCadaUm;
    return {
      value,
      formula: "IF = 8 × n' × S'c (linhas não blindadas)",
      norma: "ABNT NBR 5419-3:2026, Anexo B, B.4-b)",
      substituicao: `IF = 8 × ${nLinhas} × ${ScCadaUm} = ${value.toFixed(2)} kA`,
    };
  }

  /* ==========================================================================
     resolverKc — resolução centralizada do coeficiente kc a partir do objeto
     dimensionamento (a.dimensionamento), seguindo exatamente a mesma lógica
     de seleção de caso usada em M_DimensionamentoSPDA.calcularEExibirKcS().
     Extraída para cá para permitir reuso por outros módulos (ex.: M_MPS,
     Anexo A.4 da Parte 4) sem duplicar a lógica de seleção de caso de kc.
     Retorna null se os dados ainda forem insuficientes para resolver kc.
     ========================================================================== */
  function resolverKc(d) {
    if (!d) return null;
    const h = parseFloat(d.kcH), c = parseFloat(d.kcC), n = parseInt(d.kcN);
    if (d.casoKc === "1") return calc_kc_umaDescida();
    if (d.casoKc === "2" && h && c) return calc_kc_duasDescidas(h, c);
    if (d.casoKc === "3central" && h && c) return calc_kc_tresDescidasCentral(h, c);
    if (d.casoKc === "multiplas" && h && c && n) return calc_kc_multiplasDescidas(n, c, h);
    if (d.casoKc === "tabela13" && n) return tabela13_kc(n);
    if (d.casoKc === "manual" && d.kcManual) {
      return { value: parseFloat(d.kcManual), formula: "kc informado manualmente", norma: "Procedimento gráfico do Anexo C (Fig. C.6, C.8 ou C.9) aplicado externamente" };
    }
    return null;
  }

  return {
    tabelas: {
      TABELA2_NP,
      TABELA5_DIST_DESCIDA,
      TABELA11_KI,
      TABELA12_KM,
      TABELA3_ESPESSURAS,
      TABELA7_CONDUTORES,
      TABELA8_ELETRODOS,
      TABELA9_EQUIPOTENCIAL_BARRAS,
      TABELA10_EQUIPOTENCIAL_INTERNAS,
    },
    tabela13_kc,
    calc_anguloProtecao,
    calc_comprimentoMinEletrodo,
    calc_raioEquivalenteEletrodo,
    calc_dispensaComplementacao,
    calc_eletrodoComplementar,
    calc_numeroMinDescidas,
    calc_espacamentoReal,
    calc_kc_umaDescida,
    calc_kc_duasDescidas,
    calc_kc_tresDescidasCentral,
    calc_kc_multiplasDescidas,
    calc_distanciaSeguranca_simplificada,
    calc_distanciaSeguranca_completa,
    calc_secaoMinBlindagem,
    calc_comprimentoLinhaBlindagem_aterrada,
    calc_correnteLimiteBlindagemCobre,
    calc_correnteLimiteCondutoresNaoBlindados,
    resolverKc,
  };
})();
