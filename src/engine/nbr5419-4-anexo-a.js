/* ABNT NBR 5419-4:2026 Annex A engine: grid-like spatial shield, magnetic field H0/H1 and induced voltages and currents in loops, using ABNT NBR 5419-1:2026 Table 3. */

/* ==========================================================================
   NEMAX_CALC_P4_CAMPO — Motor de cálculo, ABNT NBR 5419-4:2026, Anexo A
   ENTREGA 2 (escopo confirmado com o usuário): Anexo A.4 (campo magnético /
   blindagem em forma de grade) e Anexo A.5 (tensões e correntes induzidas em
   laços formados pelas linhas elétricas internas).

   Dependência da Parte 1 (ABNT NBR 5419-1:2026, Tabela 3, 8.2.4), agora
   suprida — fornece IF/máx, IFN/máx, IS/máx e os tempos de frente T1
   correspondentes a cada componente, por Nível de Proteção (NP).

   Padrão de retorno idêntico aos demais motores do sistema:
     { value, formula, norma, substituicao, ...termos }

   Toda referência de equação/tabela foi conferida diretamente contra o texto
   da ABNT NBR 5419-4:2026 (Anexo A) e da ABNT NBR 5419-1:2026 (Tabela 3,
   8.2.4), sem nenhuma estimativa visual de figura sem equação companion.
   ========================================================================== */

export const NEMAX_CALC_P4_CAMPO = (function () {
  "use strict";

  /* ==========================================================================
     TABELA 3 (ABNT NBR 5419-1:2026, 8.2.4) — Parâmetros máximos por NP.
     Fonte da dependência que bloqueava a Entrega 2. Os símbolos abaixo usam a
     nomenclatura da Parte 4 (IF/máx, IFN/máx, IS/máx) explicitamente mapeada
     para os termos "primeiro impulso positivo/negativo" e "impulso
     subsequente" da Parte 1 — mapeamento confirmado em A.4.1.2.3/A.8 da
     Parte 4, que usa IF/MÁX. para a componente positiva nas mesmas equações.
     ========================================================================== */
  const TABELA3_PARTE1 = {
    I: {
      IF_MAX: 200, T1_F: 10, T2_F: 350, // primeiro impulso positivo (µs)
      IFN_MAX: 100, T1_FN: 1, T2_FN: 200, // primeiro impulso negativo (µs)
      IS_MAX: 50, T1_S: 0.25, T2_S: 100, // impulso subsequente (µs)
    },
    II: {
      IF_MAX: 150, T1_F: 10, T2_F: 350,
      IFN_MAX: 75, T1_FN: 1, T2_FN: 200,
      IS_MAX: 37.5, T1_S: 0.25, T2_S: 100,
    },
    "III-IV": {
      IF_MAX: 100, T1_F: 10, T2_F: 350,
      IFN_MAX: 50, T1_FN: 1, T2_FN: 200,
      IS_MAX: 25, T1_S: 0.25, T2_S: 100,
    },
  };

  /* NP III e IV compartilham os mesmos valores na Tabela 3 (assim como em
     toda a série 5419) — normaliza III/IV para a chave "III-IV" usada acima,
     mantendo compatibilidade com o restante do sistema que usa NP "III" e
     "IV" separadamente (ex: NEMAX_CALC_P3.tabelas.TABELA2_NP). */
  function normalizarNP(NP) {
    if (NP === "III" || NP === "IV") return "III-IV";
    return NP;
  }

  function parametrosNP(NP) {
    const chave = normalizarNP(NP);
    return TABELA3_PARTE1[chave] || null;
  }

  /* ==========================================================================
     TABELA A.4 — Fator de blindagem SF da blindagem em forma de grade (onda plana)
     Norma: A.4.1.2.2, Tabela A.4
     SF(dB) = 20·log(8,5/wm) para cobre/alumínio, em qualquer frequência relevante.
     Para aço, a 25kHz: SF = 20·log[(8,5/wm)/√(1+18×10⁻⁶·rc²)]; a 1MHz/250kHz: igual ao cobre.
     SF aumentado de 6dB se malha de equipotencialização (5.2/5.3) instalada (Parte 4).
     SF = 0 em caso de resultado negativo da equação.
     ========================================================================== */
  function calc_SF_planaCobreAluminio(wm, malhaEquipotencializacaoInstalada) {
    const bruto = 20 * Math.log10(8.5 / wm);
    const value = Math.max(0, bruto) + (malhaEquipotencializacaoInstalada ? 6 : 0);
    return {
      value,
      formula: "SF = 20×log(8,5/wm) [cobre/alumínio]" + (malhaEquipotencializacaoInstalada ? " + 6 dB (malha de equipotencialização)" : ""),
      norma: "ABNT NBR 5419-4:2026, A.4.1.2.2, Tabela A.4",
      substituicao: `SF = 20×log(8,5/${wm}) = ${bruto.toFixed(2)} dB` + (bruto < 0 ? " → 0 dB (resultado negativo, conforme nota da Tabela A.4)" : "") + (malhaEquipotencializacaoInstalada ? ` + 6 dB = ${value.toFixed(2)} dB` : ` = ${value.toFixed(2)} dB`),
      wm, malhaEquipotencializacaoInstalada,
    };
  }

  function calc_SF_planaAco(wm, rc, freq25kHz, malhaEquipotencializacaoInstalada) {
    let bruto;
    let formula;
    if (freq25kHz) {
      bruto = 20 * Math.log10((8.5 / wm) / Math.sqrt(1 + 18e-6 * rc * rc));
      formula = "SF = 20×log[(8,5/wm)/√(1+18×10⁻⁶×rc²)] [aço, 25 kHz]";
    } else {
      bruto = 20 * Math.log10(8.5 / wm);
      formula = "SF = 20×log(8,5/wm) [aço, 1 MHz ou 250 kHz]";
    }
    const value = Math.max(0, bruto) + (malhaEquipotencializacaoInstalada ? 6 : 0);
    return {
      value,
      formula,
      norma: "ABNT NBR 5419-4:2026, A.4.1.2.2, Tabela A.4",
      substituicao: `SF = ${bruto.toFixed(2)} dB` + (bruto < 0 ? " → 0 dB (resultado negativo)" : "") + (malhaEquipotencializacaoInstalada ? ` + 6 dB = ${value.toFixed(2)} dB` : ` = ${value.toFixed(2)} dB`),
      wm, rc, freq25kHz, malhaEquipotencializacaoInstalada,
    };
  }

  /* ==========================================================================
     A.4.1.1.3 — Campo magnético H1 em ponto arbitrário dentro de ZPR 1,
     caso de impacto direto da descarga atmosférica na estrutura (blindagem
     parte do SPDA externo). Equações A.1-A.6.
     ========================================================================== */
  const KH_PADRAO = 0.01; // fator de configuração típico, conforme A.4.1.1.1.3

  function calc_H1_impactoDireto(NP, componente, wm, dw, dr, kh) {
    kh = kh === undefined ? KH_PADRAO : kh;
    const p = parametrosNP(NP);
    if (!p) return null;
    let I0max_kA, label, eqNum, compLabel;
    if (componente === "F") { I0max_kA = p.IF_MAX; label = "primeiro componente positivo"; eqNum = "A.2"; compLabel = "H1/F/MÁX"; }
    else if (componente === "FN") { I0max_kA = p.IFN_MAX; label = "primeiro componente negativo"; eqNum = "A.3"; compLabel = "H1/FN/MÁX"; }
    else if (componente === "S") { I0max_kA = p.IS_MAX; label = "componentes subsequentes"; eqNum = "A.4"; compLabel = "H1/S/MÁX"; }
    else return null;

    // A.4.1.1.1.3: "I0 é a intensidade da corrente da descarga atmosférica em
    // ZPR 0A, expressa em ampères (A)" — a Tabela 3 (Parte 1) fornece os
    // valores em kA, exigindo conversão explícita para A nesta equação
    // (diferente das equações A.27-A.32, que pedem o valor em kA).
    const I0max_A = I0max_kA * 1000;
    const value = kh * I0max_A * wm / (dw * Math.sqrt(dr));
    return {
      value,
      formula: `${compLabel} = kh × I0/MÁX × wm / (dw×√dr)`,
      norma: `ABNT NBR 5419-4:2026, A.4.1.1.1.3, Equação (${eqNum})`,
      substituicao: `${compLabel} = ${kh} × ${I0max_A.toExponential(2)} A × ${wm} m / (${dw} m × √${dr} m) = ${value.toFixed(1)} A/m — corrente do ${label} = ${I0max_kA} kA, NP ${NP} (ABNT NBR 5419-1:2026, Tabela 3)`,
      kh, I0max_kA, I0max_A, wm, dw, dr, componente,
    };
  }

  /* A.4.1.1.1.3, NOTA 1 — campo reduzido por fator 2 se malha de
     equipotencialização instalada conforme 5.2/5.3 (Parte 4) */
  function aplicarReducaoMalhaEquipotencial(valorH1, malhaInstalada) {
    const value = malhaInstalada ? valorH1 / 2 : valorH1;
    return {
      value,
      formula: malhaInstalada ? "H1 reduzido por fator 2 (malha de equipotencialização instalada)" : "H1 sem redução (malha de equipotencialização não instalada)",
      norma: "ABNT NBR 5419-4:2026, A.4.1.1.1.3, NOTA 1",
      substituicao: malhaInstalada ? `H1 = ${valorH1.toFixed(3)} / 2 = ${value.toFixed(3)} A/m` : `H1 = ${valorH1.toFixed(3)} A/m (sem redução)`,
    };
  }

  /* Equações A.5/A.6 — afastamento para a blindagem ds/1 (impacto direto) */
  function calc_ds1(SF, wm) {
    const aplicavel = SF >= 10;
    const value = aplicavel ? (wm * SF) / 10 : wm;
    return {
      value,
      formula: aplicavel ? "ds/1 = wm × SF / 10 (m), para SF ≥ 10" : "ds/1 = wm (m), para SF < 10",
      norma: aplicavel ? "ABNT NBR 5419-4:2026, A.4.1.1.1.3, Equação (A.5)" : "ABNT NBR 5419-4:2026, A.4.1.1.1.3, Equação (A.6)",
      substituicao: aplicavel
        ? `ds/1 = ${wm} × ${SF.toFixed(2)} / 10 = ${value.toFixed(3)} m`
        : `ds/1 = wm = ${value.toFixed(3)} m (SF=${SF.toFixed(2)} dB < 10 dB)`,
      SF, wm, aplicavel,
    };
  }

  /* ==========================================================================
     A.4.1.2 — Campo magnético no caso de impacto próximo (ZPR 0 → ZPR 1).
     Equações A.7-A.10 (H0 incidente) e A.11-A.16 (H1 atenuado + ds/2).
     ========================================================================== */
  function calc_H0_impactoProximo(NP, componente, Sa) {
    const p = parametrosNP(NP);
    if (!p) return null;
    let I0max_kA, label, eqNum, compLabel;
    if (componente === "F") { I0max_kA = p.IF_MAX; label = "primeira componente positiva"; eqNum = "A.8"; compLabel = "H0/F/MÁX"; }
    else if (componente === "FN") { I0max_kA = p.IFN_MAX; label = "primeira componente negativa"; eqNum = "A.9"; compLabel = "H0/FN/MÁX"; }
    else if (componente === "S") { I0max_kA = p.IS_MAX; label = "componentes subsequentes"; eqNum = "A.10"; compLabel = "H0/S/MÁX"; }
    else return null;

    // A.4.1.2.3: "I0 é a corrente da descarga atmosférica na ZPR 0A, expressa
    // em ampères (A)" — mesma conversão kA→A necessária que em calc_H1_impactoDireto.
    const I0max_A = I0max_kA * 1000;
    const value = I0max_A / (2 * Math.PI * Sa);
    return {
      value,
      formula: `${compLabel} = I0/MÁX / (2×π×Sa)`,
      norma: `ABNT NBR 5419-4:2026, A.4.1.2.3, Equação (${eqNum})`,
      substituicao: `${compLabel} = ${I0max_A.toExponential(2)} A / (2×π×${Sa} m) = ${value.toFixed(1)} A/m — corrente do ${label} = ${I0max_kA} kA, NP ${NP} (ABNT NBR 5419-1:2026, Tabela 3)`,
      I0max_kA, I0max_A, Sa, componente,
    };
  }

  function calc_H1_atenuado_deH0(H0max, SF) {
    const value = H0max / Math.pow(10, SF / 20);
    return {
      value,
      formula: "H1/MÁX = H0/MÁX / 10^(SF/20)",
      norma: "ABNT NBR 5419-4:2026, A.4.1.2.4-A.4.1.2.5, Equações (A.11)-(A.14)",
      substituicao: `H1/MÁX = ${H0max.toFixed(4)} / 10^(${SF.toFixed(2)}/20) = ${value.toFixed(4)}`,
      H0max, SF,
    };
  }

  /* Equações A.15/A.16 — afastamento para a blindagem ds/2 (impacto próximo) */
  function calc_ds2(SF, wm) {
    const aplicavel = SF >= 10;
    const value = aplicavel ? (wm * SF) / 10 : wm;
    return {
      value,
      formula: aplicavel ? "ds/2 = wm × SF / 10 (m), para SF ≥ 10" : "ds/2 = wm (m), para SF < 10",
      norma: aplicavel ? "ABNT NBR 5419-4:2026, A.4.1.2.6, Equação (A.15)" : "ABNT NBR 5419-4:2026, A.4.1.2.6, Equação (A.16)",
      substituicao: aplicavel
        ? `ds/2 = ${wm} × ${SF.toFixed(2)} / 10 = ${value.toFixed(3)} m`
        : `ds/2 = wm = ${value.toFixed(3)} m (SF=${SF.toFixed(2)} dB < 10 dB)`,
      SF, wm, aplicavel,
    };
  }

  /* Equações A.17/A.18 — distância sa (raio efetivo de impacto próximo) */
  function calc_sa(raioEsferaRolante, alturaEstrutura, comprimentoEstrutura) {
    const r = raioEsferaRolante, H = alturaEstrutura, L = comprimentoEstrutura;
    if (H < r) {
      const value = Math.sqrt(2 * r * H - H * H);
      return {
        value,
        formula: "sa = √(2×r×H − H²), para H < r",
        norma: "ABNT NBR 5419-4:2026, A.4.1.2.9, Equação (A.17)",
        substituicao: `sa = √(2×${r}×${H} − ${H}²) = ${value.toFixed(3)} m`,
        r, H, L,
      };
    } else {
      const value = r + L / 2;
      return {
        value,
        formula: "sa = r + L/2, para H ≥ r",
        norma: "ABNT NBR 5419-4:2026, A.4.1.2.9, Equação (A.18)",
        substituicao: `sa = ${r} + ${L}/2 = ${value.toFixed(3)} m`,
        r, H, L,
      };
    }
  }

  /* ==========================================================================
     A.4.1.3 — Blindagem em forma de grade para ZPR 2 ou maiores.
     Equação A.19: Hn+1 = Hn / 10^(SF/20)
     ========================================================================== */
  function calc_Hn1_deZPRn(Hn, SF) {
    const value = Hn / Math.pow(10, SF / 20);
    return {
      value,
      formula: "Hn+1 = Hn / 10^(SF/20)",
      norma: "ABNT NBR 5419-4:2026, A.4.1.3.1, Equação (A.19)",
      substituicao: `Hn+1 = ${Hn.toFixed(4)} / 10^(${SF.toFixed(2)}/20) = ${value.toFixed(4)}`,
      Hn, SF,
    };
  }

  /* ==========================================================================
     ANEXO A.5 — CÁLCULO DAS TENSÕES E CORRENTES INDUZIDAS EM LAÇOS
     ========================================================================== */

  /* Equação A.26 — indutância própria de um laço retangular */
  function calc_LS_laco(l, b, rc) {
    const termo1 = 0.8 * Math.sqrt(l * l + b * b);
    const termo2 = -0.8 * (l + b);
    const termo3 = 0.4 * l * Math.log((2 * b) / rc) * (1 + Math.sqrt(1 + (b / l) * (b / l)));
    const termo4 = 0.4 * b * Math.log((2 * l) / rc) * (1 + Math.sqrt(1 + (l / b) * (l / b)));
    const value = (termo1 + termo2 + termo3 + termo4) * 1e-6;
    return {
      value,
      formula: "Ls = [0,8×√(l²+b²) − 0,8×(l+b) + 0,4×l×ln(2b/rc)×(1+√(1+(b/l)²)) + 0,4×b×ln(2l/rc)×(1+√(1+(l/b)²))] × 10⁻⁶ (H)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.6, Equação (A.26)",
      substituicao: `Ls = ${value.toExponential(4)} H, para laço retangular l=${l} m, b=${b} m, rc=${rc} m`,
      l, b, rc,
    };
  }

  /* ---------- A.5.2 — situação dentro de ZPR 1, impacto direto ---------- */

  /* Equação A.23 — UOC/MÁX (geral, qualquer componente via I0/MAX e T1) */
  function calc_UOC_max_impactoDireto(NP, componente, b, l, dl_w, dl_r, wm, kh) {
    kh = kh === undefined ? KH_PADRAO : kh;
    const p = parametrosNP(NP);
    if (!p) return null;
    const mu0 = 4 * Math.PI * 1e-7;
    let I0max, T1, label, eqNum;
    if (componente === "F") { I0max = p.IF_MAX; T1 = p.T1_F; label = "primeira componente positiva"; eqNum = "A.27"; }
    else if (componente === "FN") { I0max = p.IFN_MAX; T1 = p.T1_FN; label = "primeira componente negativa"; eqNum = "A.29"; }
    else if (componente === "S") { I0max = p.IS_MAX; T1 = p.T1_S; label = "componentes subsequentes"; eqNum = "A.31"; }
    else return null;

    // I0max em kA, T1 em µs -> ajusta unidades para V: I0max[A] / T1[s]
    const I0max_A = I0max * 1e3;
    const T1_s = T1 * 1e-6;
    const value = mu0 * b * Math.log(1 + l / dl_w) * kh * (wm / Math.sqrt(dl_r)) * (I0max_A / T1_s);
    return {
      value,
      formula: "Uoc/máx = μ0×b×ln(1+l/dl/w)×kh×(wm/√dl/r)×I0/máx/T1",
      norma: `ABNT NBR 5419-4:2026, A.5.2.3, Equação (A.23) — forma geral, válida para ${label}`,
      substituicao: `Uoc/máx = 4π×10⁻⁷ × ${b} × ln(1+${l}/${dl_w}) × ${kh} × (${wm}/√${dl_r}) × ${I0max_A.toExponential(2)} A / ${T1_s.toExponential(2)} s = ${value.toFixed(1)} V (NP ${NP}, ${label})`,
      I0max, T1, b, l, dl_w, dl_r, wm, kh, componente,
    };
  }

  /* Versões simplificadas por componente — equações A.27/A.29/A.31 (coeficiente numérico
     já embute μ0 e T1 padrão de cada componente, conforme texto literal da norma) */
  function calc_UOC_max_F(b, l, dl_w, dl_r, wm, IF_MAX_kA) {
    const value = 1.26 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IF_MAX_kA;
    return {
      value,
      formula: "Uoc/F/máx = 1,26 × b × ln(1+l/dl/w) × (wm/√dl/r) × IF/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.7, Equação (A.27)",
      substituicao: `Uoc/F/máx = 1,26 × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IF_MAX_kA} = ${value.toFixed(1)} V`,
      b, l, dl_w, dl_r, wm, IF_MAX_kA,
    };
  }

  function calc_ISC_max_F(b, l, dl_w, dl_r, wm, IF_MAX_kA, LS) {
    const value = 12.6e-6 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IF_MAX_kA / LS;
    return {
      value,
      formula: "Isc/F/máx = 12,6×10⁻⁶ × b × ln(1+l/dl/w) × (wm/√dl/r) × IF/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.7, Equação (A.28)",
      substituicao: `Isc/F/máx = 12,6×10⁻⁶ × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IF_MAX_kA} / ${LS.toExponential(3)} = ${value.toFixed(2)} A`,
      b, l, dl_w, dl_r, wm, IF_MAX_kA, LS,
    };
  }

  function calc_UOC_max_FN(b, l, dl_w, dl_r, wm, IFN_MAX_kA) {
    const value = 12.6 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IFN_MAX_kA;
    return {
      value,
      formula: "Uoc/FN/máx = 12,6 × b × ln(1+l/dl/w) × (wm/√dl/r) × IFN/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.8, Equação (A.29)",
      substituicao: `Uoc/FN/máx = 12,6 × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IFN_MAX_kA} = ${value.toFixed(1)} V`,
      b, l, dl_w, dl_r, wm, IFN_MAX_kA,
    };
  }

  function calc_ISC_max_FN(b, l, dl_w, dl_r, wm, IFN_MAX_kA, LS) {
    const value = 12.6e-6 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IFN_MAX_kA / LS;
    return {
      value,
      formula: "Isc/FN/máx = 12,6×10⁻⁶ × b × ln(1+l/dl/w) × (wm/√dl/r) × IFN/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.8, Equação (A.30)",
      substituicao: `Isc/FN/máx = 12,6×10⁻⁶ × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IFN_MAX_kA} / ${LS.toExponential(3)} = ${value.toFixed(2)} A`,
      b, l, dl_w, dl_r, wm, IFN_MAX_kA, LS,
    };
  }

  function calc_UOC_max_S(b, l, dl_w, dl_r, wm, IS_MAX_kA) {
    const value = 50.4 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IS_MAX_kA;
    return {
      value,
      formula: "Uoc/S/máx = 50,4 × b × ln(1+l/dl/w) × (wm/√dl/r) × IS/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.9, Equação (A.31)",
      substituicao: `Uoc/S/máx = 50,4 × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IS_MAX_kA} = ${value.toFixed(1)} V`,
      b, l, dl_w, dl_r, wm, IS_MAX_kA,
    };
  }

  function calc_ISC_max_S(b, l, dl_w, dl_r, wm, IS_MAX_kA, LS) {
    const value = 12.6e-6 * b * Math.log(1 + l / dl_w) * (wm / Math.sqrt(dl_r)) * IS_MAX_kA / LS;
    return {
      value,
      formula: "Isc/S/máx = 12,6×10⁻⁶ × b × ln(1+l/dl/w) × (wm/√dl/r) × IS/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.2.9, Equação (A.32)",
      substituicao: `Isc/S/máx = 12,6×10⁻⁶ × ${b} × ln(1+${l}/${dl_w}) × (${wm}/√${dl_r}) × ${IS_MAX_kA} / ${LS.toExponential(3)} = ${value.toFixed(2)} A`,
      b, l, dl_w, dl_r, wm, IS_MAX_kA, LS,
    };
  }

  /* ---------- A.5.3 — situação dentro de ZPR 1, impacto próximo (campo homogêneo H1) ---------- */

  function calc_UOC_max_homogeneo(b, l, H1_componente_max, coefByComponente) {
    // coefByComponente: 0.126 (F), 1.26 (FN), 5.04 (S) — conforme A.37/A.39/A.41
    const value = coefByComponente * b * l * H1_componente_max;
    return { value, b, l, H1_componente_max, coefByComponente };
  }

  function calc_UOC_max_F_homogeneo(b, l, H1_F_max) {
    const value = 0.126 * b * l * H1_F_max;
    return {
      value,
      formula: "Uoc/F/máx = 0,126 × b × l × H1/F/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-e), Equação (A.37)",
      substituicao: `Uoc/F/máx = 0,126 × ${b} × ${l} × ${H1_F_max.toFixed(4)} = ${value.toFixed(2)} V`,
      b, l, H1_F_max,
    };
  }

  function calc_ISC_max_F_homogeneo(b, l, H1_F_max, LS) {
    const value = 1.26e-6 * b * l * H1_F_max / LS;
    return {
      value,
      formula: "Isc/F/máx = 1,26×10⁻⁶ × b × l × H1/F/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-e), Equação (A.38)",
      substituicao: `Isc/F/máx = 1,26×10⁻⁶ × ${b} × ${l} × ${H1_F_max.toFixed(4)} / ${LS.toExponential(3)} = ${value.toFixed(4)} A`,
      b, l, H1_F_max, LS,
    };
  }

  function calc_UOC_max_FN_homogeneo(b, l, H1_FN_max) {
    const value = 1.26 * b * l * H1_FN_max;
    return {
      value,
      formula: "Uoc/FN/máx = 1,26 × b × l × H1/FN/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-f), Equação (A.39)",
      substituicao: `Uoc/FN/máx = 1,26 × ${b} × ${l} × ${H1_FN_max.toFixed(4)} = ${value.toFixed(2)} V`,
      b, l, H1_FN_max,
    };
  }

  function calc_ISC_max_FN_homogeneo(b, l, H1_FN_max, LS) {
    const value = 1.26e-6 * b * l * H1_FN_max / LS;
    return {
      value,
      formula: "Isc/FN/máx = 1,26×10⁻⁶ × b × l × H1/FN/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-f), Equação (A.40)",
      substituicao: `Isc/FN/máx = 1,26×10⁻⁶ × ${b} × ${l} × ${H1_FN_max.toFixed(4)} / ${LS.toExponential(3)} = ${value.toFixed(4)} A`,
      b, l, H1_FN_max, LS,
    };
  }

  function calc_UOC_max_S_homogeneo(b, l, H1_S_max) {
    const value = 5.04 * b * l * H1_S_max;
    return {
      value,
      formula: "Uoc/S/máx = 5,04 × b × l × H1/S/máx (V)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-g), Equação (A.41)",
      substituicao: `Uoc/S/máx = 5,04 × ${b} × ${l} × ${H1_S_max.toFixed(4)} = ${value.toFixed(2)} V`,
      b, l, H1_S_max,
    };
  }

  function calc_ISC_max_S_homogeneo(b, l, H1_S_max, LS) {
    const value = 1.26e-6 * b * l * H1_S_max / LS;
    return {
      value,
      formula: "Isc/S/máx = 1,26×10⁻⁶ × b × l × H1/S/máx / Ls (A)",
      norma: "ABNT NBR 5419-4:2026, A.5.3-g), Equação (A.42)",
      substituicao: `Isc/S/máx = 1,26×10⁻⁶ × ${b} × ${l} × ${H1_S_max.toFixed(4)} / ${LS.toExponential(3)} = ${value.toFixed(4)} A`,
      b, l, H1_S_max, LS,
    };
  }

  /* A.5.4 — ZPR 2 e mais altas: mesma equação de A.5.3 (impacto próximo,
     campo homogêneo), substituindo H1 por Hn. Reaproveita as funções acima
     com o valor de Hn calculado via calc_Hn1_deZPRn(). */

  return {
    TABELA3_PARTE1,
    normalizarNP,
    parametrosNP,
    calc_SF_planaCobreAluminio,
    calc_SF_planaAco,
    calc_H1_impactoDireto,
    aplicarReducaoMalhaEquipotencial,
    calc_ds1,
    calc_H0_impactoProximo,
    calc_H1_atenuado_deH0,
    calc_ds2,
    calc_sa,
    calc_Hn1_deZPRn,
    calc_LS_laco,
    calc_UOC_max_impactoDireto,
    calc_UOC_max_F,
    calc_ISC_max_F,
    calc_UOC_max_FN,
    calc_ISC_max_FN,
    calc_UOC_max_S,
    calc_ISC_max_S,
    calc_UOC_max_F_homogeneo,
    calc_ISC_max_F_homogeneo,
    calc_UOC_max_FN_homogeneo,
    calc_ISC_max_FN_homogeneo,
    calc_UOC_max_S_homogeneo,
    calc_ISC_max_S_homogeneo,
  };
})();
