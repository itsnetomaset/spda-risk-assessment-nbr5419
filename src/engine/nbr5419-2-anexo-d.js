/* ABNT NBR 5419-2:2026 Annex D engine: risk of loss of economic value (R4) and cost-benefit of protection (D.2). */

/* ==========================================================================
   NEMAX_CALC_R4 — Motor de cálculo, ABNT NBR 5419-2:2026, Anexo D
   Risco de perda de valor econômico (R4) e avaliação do custo da
   eficiência da proteção (D.2).

   Conforme D.1.1, R4 é informativo e opcional — não substitui nem altera
   R1/R3 (que continuam sendo os critérios normativos de necessidade de
   proteção). Reaproveita os mesmos N (eventos perigosos) e P (probabilidades)
   já calculados pelo motor de risco principal (Calculo.executar), evitando
   duplicar lógica — a única peça nova é a perda L4 (Tabela D.1), que depende
   de valores monetários informados pelo usuário, e o workflow de
   custo-benefício (D.2).

   Padrão de retorno idêntico aos demais motores do sistema:
     { value, formula, norma, substituicao, ...termos }

   Toda fórmula, tabela e item normativo foi conferido diretamente contra o
   texto da ABNT NBR 5419-2:2026, Anexo D (D.1 a D.12), incluindo a Tabela D.1
   (fórmulas de perda L4) e a Tabela D.2 (valores típicos de LT/LF/LO para
   perda L4 — distinta da Tabela C.2, usada para L1).
   ========================================================================== */

export const NEMAX_CALC_R4 = (function () {
  "use strict";

  /* ==========================================================================
     TABELA D.2 — Valores médios típicos de LT, LF, LO para perda L4
     Norma: D.3.1, Tabela D.2
     (Distinta da Tabela C.2, usada para a perda L1 — mesmo nome de variável,
     valores e categorias diferentes.)
     ========================================================================== */
  const TABELA_D2_L4 = {
    LT: [
      { label: "Todos os tipos em que somente animais estão presentes", value: 1e-2 },
    ],
    LF: [
      { label: "Risco de explosão", value: 1 },
      { label: "Hospital, industrial, museu, agricultura", value: 0.5 },
      { label: "Hotel, escola, escritório, igreja, entretenimento público, comercial", value: 0.2 },
      { label: "Outros", value: 1e-1 },
    ],
    LO: [
      { label: "Risco de explosão", value: 1e-1 },
      { label: "Hospital, industrial, escritório, hotel, comercial", value: 1e-2 },
      { label: "Museu, agricultura, escola, igreja, entretenimento público", value: 1e-3 },
      { label: "Outros", value: 1e-4 },
    ],
  };

  /* ==========================================================================
     TABELA D.1 — Tipo de perda L4: fórmulas de perda de cada zona
     Norma: D.3.1, Tabela D.1, Equações (D.1)-(D.4)

     Nota normativa (Tabela D.1, nota 'a'): as relações ca/ct,
     (ca+cb+cc+cs)/ct e cs/ct só são consideradas se a análise de risco for
     conduzida com valores monetários reais por zona de estudo. Caso se
     utilize o valor representativo de RT=10⁻³ (D.1.2), as relações devem
     ser substituídas por 1 — implementado aqui como modo "simplificado".
     ========================================================================== */

  // Eq. (D.1)/(D.2): LA = LU = rt × LT × ca/ct
  function calc_LA4_LU4(rt, LT, ca, ct, modoSimplificado) {
    const razao = modoSimplificado ? 1 : (ct > 0 ? ca / ct : 0);
    const value = rt * LT * razao;
    return {
      value,
      formula: "L_A4 (L_U4) = r_t × L_T × c_a/c_t",
      norma: "ABNT NBR 5419-2:2026, D.3.1, Tabela D.1, Eq. (D.1)/(D.2)",
      substituicao: modoSimplificado
        ? `L_A4 = ${rt} × ${LT} × 1 (modo simplificado, relação=1) = ${value.toExponential(4)}`
        : `L_A4 = ${rt} × ${LT} × (${ca}/${ct}) = ${value.toExponential(4)}`,
      rt, LT, ca, ct, modoSimplificado,
    };
  }

  // Eq. (D.3): LB = LV = rp × rf × LF × (ca+cb+cc+cs)/ct
  function calc_LB4_LV4(rp, rf, LF, ca, cb, cc, cs, ct, modoSimplificado) {
    const soma = ca + cb + cc + cs;
    const razao = modoSimplificado ? 1 : (ct > 0 ? soma / ct : 0);
    const value = rp * rf * LF * razao;
    return {
      value,
      formula: "L_B4 (L_V4) = r_p × r_f × L_F × (c_a+c_b+c_c+c_s)/c_t",
      norma: "ABNT NBR 5419-2:2026, D.3.1, Tabela D.1, Eq. (D.3)",
      substituicao: modoSimplificado
        ? `L_B4 = ${rp} × ${rf} × ${LF} × 1 (modo simplificado, relação=1) = ${value.toExponential(4)}`
        : `L_B4 = ${rp} × ${rf} × ${LF} × (${soma}/${ct}) = ${value.toExponential(4)}`,
      rp, rf, LF, ca, cb, cc, cs, ct, modoSimplificado,
    };
  }

  // Eq. (D.4): LC = LM = LW = LZ = LO × cs/ct
  function calc_LC4_LM4_LW4_LZ4(LO, cs, ct, modoSimplificado) {
    const razao = modoSimplificado ? 1 : (ct > 0 ? cs / ct : 0);
    const value = LO * razao;
    return {
      value,
      formula: "L_C4 (L_M4, L_W4, L_Z4) = L_O × c_s/c_t",
      norma: "ABNT NBR 5419-2:2026, D.3.1, Tabela D.1, Eq. (D.4)",
      substituicao: modoSimplificado
        ? `L_C4 = ${LO} × 1 (modo simplificado, relação=1) = ${value.toExponential(4)}`
        : `L_C4 = ${LO} × (${cs}/${ct}) = ${value.toExponential(4)}`,
      LO, cs, ct, modoSimplificado,
    };
  }

  /* ==========================================================================
     D.1.4 — R4 = RA4* + RB4 + RC4 + RM4 + RU4* + RV4 + RW4 + RZ4
     (* somente para propriedades onde animais com valor comercial devam ser
     considerados — RA4 e RU4 exigidos só se houver ca > 0)

     Reaproveita calc_R (N × P × L) já existente no motor principal — aqui
     reimplementado localmente de forma idêntica para manter o módulo
     autocontido e testável isoladamente.
     ========================================================================== */
  function calc_R4_componente(N, P, L4, nome, eq) {
    const value = N * P * L4;
    return {
      value,
      formula: `${nome} = N × P × L4`,
      norma: `ABNT NBR 5419-2:2026, D.1.4, ${eq}`,
      substituicao: `${nome} = ${N.toExponential(4)} × ${P.toExponential(4)} × ${L4.toExponential(4)} = ${value.toExponential(4)} /ano`,
    };
  }

  /* Soma final de R4, com regra de inclusão condicional de RA4/RU4 (animais) */
  function calc_R4_total(componentes) {
    // componentes: { RA4, RB4, RC4, RM4, RU4, RV4, RW4, RZ4 } — cada um
    // pode ser null se a fonte de dano correspondente (S1-S4) não estiver
    // ativa, ou (para RA4/RU4) se não houver valor de animais informado.
    let total = 0;
    const parcelas = [];
    for (const [nome, comp] of Object.entries(componentes)) {
      if (comp && typeof comp.value === "number") {
        total += comp.value;
        parcelas.push(`${nome}=${comp.value.toExponential(4)}`);
      }
    }
    return {
      value: total,
      formula: "R4 = RA4* + RB4 + RC4 + RM4 + RU4* + RV4 + RW4 + RZ4",
      norma: "ABNT NBR 5419-2:2026, D.1.4",
      substituicao: `R4 = ${parcelas.join(" + ")} = ${total.toExponential(4)} /ano`,
    };
  }

  /* ==========================================================================
     D.1.2 — Risco tolerável representativo RT4 = 10⁻³ (não normalizado,
     valor representativo sugerido pela norma)
     ========================================================================== */
  const RT4_REPRESENTATIVO = 1e-3;

  /* ==========================================================================
     D.2 — AVALIAÇÃO DO CUSTO DA EFICIÊNCIA DA PROTEÇÃO
     Equações (D.7) a (D.12)
     ========================================================================== */

  // Eq. (D.8): CL = R4 × ct (custo total de perdas SEM medidas de proteção)
  function calc_CL(R4_sem, ct) {
    const value = R4_sem * ct;
    return {
      value,
      formula: "CL = R4 × ct",
      norma: "ABNT NBR 5419-2:2026, D.4, Eq. (D.8)",
      substituicao: `CL = ${R4_sem.toExponential(4)} × ${ct} = ${value.toFixed(2)}`,
      R4_sem, ct,
    };
  }

  // Eq. (D.10): CRL = R'4 × ct (custo total de perdas residuais COM proteção)
  function calc_CRL(R4_com, ct) {
    const value = R4_com * ct;
    return {
      value,
      formula: "CRL = R'4 × ct",
      norma: "ABNT NBR 5419-2:2026, D.4, Eq. (D.10)",
      substituicao: `CRL = ${R4_com.toExponential(4)} × ${ct} = ${value.toFixed(2)}`,
      R4_com, ct,
    };
  }

  // Eq. (D.11): CPM = CP × (i + a + m)
  function calc_CPM(CP, i, a, m) {
    const value = CP * (i + a + m);
    return {
      value,
      formula: "CPM = CP × (i + a + m)",
      norma: "ABNT NBR 5419-2:2026, D.4, Eq. (D.11)",
      substituicao: `CPM = ${CP} × (${i} + ${a} + ${m}) = ${CP} × ${(i + a + m).toFixed(4)} = ${value.toFixed(2)}`,
      CP, i, a, m,
    };
  }

  // Eq. (D.12): SM = CL - (CPM + CRL)
  function calc_SM(CL, CPM, CRL) {
    const value = CL - (CPM + CRL);
    return {
      value,
      formula: "SM = CL - (CPM + CRL)",
      norma: "ABNT NBR 5419-2:2026, D.4, Eq. (D.12)",
      substituicao: `SM = ${CL.toFixed(2)} - (${CPM.toFixed(2)} + ${CRL.toFixed(2)}) = ${value.toFixed(2)}`,
      justificado: value > 0,
      CL, CPM, CRL,
    };
  }

  /* D.2.3/D.2.4 — interpretação direta da comparação de custos (sem usar SM,
     para os casos em que se quer apenas o parecer qualitativo) */
  function avaliarJustificativaCusto(CL, CRL, CPM) {
    const justificado = CL >= CRL + CPM;
    return {
      justificado,
      norma: justificado ? "ABNT NBR 5419-2:2026, D.2.4" : "ABNT NBR 5419-2:2026, D.2.3",
      mensagem: justificado
        ? `CL (${CL.toFixed(2)}) ≥ CRL + CPM (${(CRL + CPM).toFixed(2)}) — sob o ponto de vista econômico, o custo envolvido na adoção da proteção é justificado (D.2.4).`
        : `CL (${CL.toFixed(2)}) < CRL + CPM (${(CRL + CPM).toFixed(2)}) — sob o ponto de vista econômico, o custo envolvido na adoção da proteção não é justificado (D.2.3).`,
    };
  }

  return {
    TABELA_D2_L4,
    RT4_REPRESENTATIVO,
    calc_LA4_LU4,
    calc_LB4_LV4,
    calc_LC4_LM4_LW4_LZ4,
    calc_R4_componente,
    calc_R4_total,
    calc_CL,
    calc_CRL,
    calc_CPM,
    calc_SM,
    avaliarJustificativaCusto,
  };
})();
