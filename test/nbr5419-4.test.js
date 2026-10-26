// ABNT NBR 5419-4:2026, electrical and electronic systems within structures.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { NEMAX_CALC_P4 as P4 } from "../src/engine/nbr5419-4.js";
import { NEMAX_CALC_P4_CAMPO as CA } from "../src/engine/nbr5419-4-anexo-a.js";
import { calcularPontoDPS, calcularAvaliacaoCampo } from "../src/engine/mps.js";
import { FIXTURES } from "./characterization/scenarios.js";
import { assertClose } from "./helpers.js";

const MU0 = 4 * Math.PI * 1e-7;

describe("tables", () => {
  test("4.3.1: lightning protection zones 0A, 0B, 1 and 2 or higher", () => {
    assert.deepEqual(P4.listarZPR().map((z) => z.id), ["0A", "0B", "1", "2+"]);
  });
  test("Table 1: minimum cross-section of bonding components", () => {
    const s = (componente, material) => P4.tabela1_secaoMinima(componente, material).value;
    assert.equal(s("Barras de equipotencialização", "Cobre"), 50);
    assert.equal(s("Condutores para interligação dos DPS", "Cobre — Classe I"), 16);
    assert.equal(s("Condutores para interligação dos DPS", "Cobre — Classe II"), 6);
    assert.equal(s("Condutores para interligação dos DPS", "Cobre — Classe III"), 2.5);
    assert.equal(P4.tabela1_secaoMinima("inexistente", "Cobre"), null);
  });
  test("Table A.1: required impulse withstand voltage U_W (kV) by nominal voltage and category", () => {
    const linha = (faixa) => ["IV", "III", "II", "I"].map((cat) => P4.tabelaA1_uw(faixa, cat).value);
    assert.deepEqual(linha("110 a 127"), [4, 2.5, 1.5, 0.8]);
    assert.deepEqual(linha("220 a 254"), [6, 4, 2.5, 1.5]);
    assert.deepEqual(linha("380 a 480"), [8, 6, 4, 2.5]);
  });
  test("Table D.1: preferred I_imp, with Q = I_imp/2 and W/R = I_imp²/4 (rounded in the table)", () => {
    for (const { iimp, q, wr } of P4.tabelas.TABELA_D1_IIMP) {
      assert.equal(q, iimp / 2);
      assert.ok(Math.abs(wr - (iimp * iimp) / 4) < 0.5, `I_imp ${iimp}: W/R ${wr}`);
    }
    assert.equal(P4.tabelaD1_porIimp(7), null);
  });
  test("NBR 5419-1 Table 3: maximum currents and front times per protection level", () => {
    const p = (np) => { const x = CA.parametrosNP(np); return [x.IF_MAX, x.IFN_MAX, x.IS_MAX, x.T1_F, x.T1_FN, x.T1_S]; };
    assert.deepEqual(p("I"), [200, 100, 50, 10, 1, 0.25]);
    assert.deepEqual(p("II"), [150, 75, 37.5, 10, 1, 0.25]);
    assert.deepEqual(p("III"), [100, 50, 25, 10, 1, 0.25]);
    assert.deepEqual(p("IV"), p("III"));
  });
});

describe("Annex C: coordinated SPD selection", () => {
  test("C.2.1.3: U_p/f = U_p + ΔU for voltage-limiting SPDs and max(U_p, ΔU) for voltage-switching SPDs", () => {
    assert.equal(P4.calc_UpEfetivo_limitador(1.5, 0.25).value, 1.75);
    assert.equal(P4.calc_UpEfetivo_comutador(2.5, 0.25).value, 2.5);
    assert.equal(P4.calc_UpEfetivo_comutador(0.2, 0.9).value, 0.9);
  });
  test("C.2.1.4, note: ΔU estimated as 0.1 kV per kA per metre of connecting leads", () => {
    assertClose(P4.calc_deltaU_estimado(5, 0.5).value, 0.25);
  });
  test("C.2.1.9 a): negligible circuit length, U_p/f ≤ U_W", () => {
    const r = P4.verificarCondicaoProtecao(1.4, 1.5, 0, false);
    assert.equal(r.protegido, true);
    assert.equal(r.condicaoSatisfeita, "a");
  });
  test("C.2.1.9 b): circuit up to 10 m, U_p/f ≤ 0.8 · U_W", () => {
    assert.equal(P4.verificarCondicaoProtecao(1.2, 1.5, 5, false).condicaoSatisfeita, "b");
    assert.equal(P4.verificarCondicaoProtecao(1.3, 1.5, 5, false).protegido, false);
  });
  test("C.2.1.9 c): critical system, U_p/f ≤ 0.5 · U_W", () => {
    const c = (upf) => P4.verificarCondicaoProtecao(upf, 1.5, 5, true).condicoes.find((x) => x.id === "c");
    assert.equal(c(0.75).atendida, true);
    assert.equal(c(0.76).atendida, false);
  });
  test("C.2.1.9 d): circuits longer than 10 m need an alternative measure", () => {
    const r = P4.verificarCondicaoProtecao(0.5, 1.5, 25, false);
    assert.equal(r.protegido, false);
    assert.equal(r.condicoes.find((x) => x.id === "d").aplicavel, true);
  });
  test("C.2.1.9 c): for a critical system, meeting a) or b) is not enough", () => {
    // 0.9 kV ≤ 0.8 × 1.5 kV satisfies b), but not 0.5 × 1.5 kV
    const r = P4.verificarCondicaoProtecao(0.9, 1.5, 5, true);
    assert.equal(r.protegido, false);
    assert.equal(r.condicoes.find((x) => x.id === "b").aplicavel, false);
    assert.equal(P4.verificarCondicaoProtecao(1.4, 1.5, 0, true).protegido, false);
    const ok = P4.verificarCondicaoProtecao(0.7, 1.5, 5, true);
    assert.equal(ok.protegido, true);
    assert.equal(ok.condicaoSatisfeita, "c");
  });
  test("C.2.1.6: oscillation may double U_p/f in long circuits", () => {
    assert.equal(P4.avisoOscilacaoCircuitoLongo(1, 2.5).risco, false);
    assert.equal(P4.avisoOscilacaoCircuitoLongo(1.5, 2.5).risco, true);
  });
});

describe("Annex A: grid-like spatial shields", () => {
  test("Table A.4: SF = 20 · log(8.5/w_m) for copper or aluminium, never negative, +6 dB with a bonding mesh", () => {
    assertClose(CA.calc_SF_planaCobreAluminio(0.85, false).value, 20);
    assert.equal(CA.calc_SF_planaCobreAluminio(10, false).value, 0);
    assertClose(CA.calc_SF_planaCobreAluminio(0.85, true).value, 26);
  });
  test("Table A.4: steel at 25 kHz, SF = 20 · log[(8.5/w_m) / √(1 + 18·10⁻⁶ · r_c²)]", () => {
    assertClose(CA.calc_SF_planaAco(0.5, 0.004, true, false).value, 20 * Math.log10(17 / Math.sqrt(1 + 18e-6 * 0.004 ** 2)));
    assertClose(CA.calc_SF_planaAco(0.5, 0.004, false, false).value, 20 * Math.log10(17));
  });
  test("Eq. (A.2) to (A.4): H1 = k_h · I0 · w_m / (d_w · √d_r), I0 in A", () => {
    assertClose(CA.calc_H1_impactoDireto("I", "F", 5, 3, 2).value, (0.01 * 200000 * 5) / (3 * Math.SQRT2));
    assertClose(CA.calc_H1_impactoDireto("II", "S", 5, 3, 2, 0.02).value, (0.02 * 37500 * 5) / (3 * Math.SQRT2));
  });
  test("Eq. (A.5)/(A.6) and (A.15)/(A.16): safety distance d_s = w_m · SF/10 for SF ≥ 10 dB, otherwise w_m", () => {
    assert.equal(CA.calc_ds1(25, 2).value, 5);
    assert.equal(CA.calc_ds1(5, 2).value, 2);
    assert.equal(CA.calc_ds2(25, 2).value, 5);
  });
  test("Eq. (A.8) to (A.10): H0 = I0 / (2π · s_a)", () => {
    assertClose(CA.calc_H0_impactoProximo("I", "F", 100).value, 200000 / (2 * Math.PI * 100));
  });
  test("Eq. (A.11) to (A.14) and (A.19): each shield divides the field by 10^(SF/20)", () => {
    assertClose(CA.calc_H1_atenuado_deH0(100, 20).value, 10);
    assertClose(CA.calc_Hn1_deZPRn(50, 40).value, 0.5);
  });
  test("Eq. (A.17)/(A.18): s_a = √(2rH − H²) for H < r, otherwise r + L/2", () => {
    assertClose(CA.calc_sa(45, 20, 40).value, Math.sqrt(1400));
    assert.equal(CA.calc_sa(20, 25, 30).value, 35);
  });
  test("Eq. (A.26): self-inductance of a rectangular loop", () => {
    const [l, b, rc] = [10, 0.5, 0.005];
    const esperado = (0.8 * Math.sqrt(l * l + b * b) - 0.8 * (l + b)
      + 0.4 * l * Math.log((2 * b) / rc) * (1 + Math.sqrt(1 + (b / l) ** 2))
      + 0.4 * b * Math.log((2 * l) / rc) * (1 + Math.sqrt(1 + (l / b) ** 2))) * 1e-6;
    assertClose(CA.calc_LS_laco(l, b, rc).value, esperado);
  });
});

describe("Annex A: the simplified coefficients agree with the general equations", () => {
  // Coefficients 1.26 / 12.6 / 50.4 (A.27, A.29, A.31) are μ0 · k_h(0.01) · 10³ / T1
  // with T1 = 10, 1 and 0.25 μs, rounded to three digits (within 0.5 %).
  const [b, l, dlw, dlr, wm] = [0.5, 10, 1, 1.5, 5];
  const comum = b * Math.log(1 + l / dlw) * (wm / Math.sqrt(dlr));
  const casos = [
    ["F", CA.calc_UOC_max_F(b, l, dlw, dlr, wm, 200), 1.26],
    ["FN", CA.calc_UOC_max_FN(b, l, dlw, dlr, wm, 100), 12.6],
    ["S", CA.calc_UOC_max_S(b, l, dlw, dlr, wm, 50), 50.4],
  ];
  for (const [comp, simplificada, coef] of casos) {
    test(`direct strike, U_oc,${comp}: coefficient ${coef} and Eq. (A.23)`, () => {
      const geral = CA.calc_UOC_max_impactoDireto("I", comp, b, l, dlw, dlr, wm).value;
      assertClose(simplificada.value, coef * comum * simplificada[`I${comp}_MAX_kA`]);
      assertClose(simplificada.value, geral, 5e-3);
    });
  }
  test("direct strike, I_sc = U_oc · T1 / L_s gives the common coefficient 12.6 · 10⁻⁶", () => {
    const LS = 1e-5;
    assertClose(CA.calc_ISC_max_F(b, l, dlw, dlr, wm, 200, LS).value, (12.6e-6 * comum * 200) / LS);
    assertClose(12.6e-6, MU0 * 0.01 * 1e3, 5e-3);
  });
  test("nearby strike, uniform field: U_oc = μ0 · b · l · H1 / T1 and I_sc = μ0 · b · l · H1 / L_s", () => {
    assertClose(0.126, MU0 / 10e-6, 5e-3);
    assertClose(1.26, MU0 / 1e-6, 5e-3);
    assertClose(5.04, MU0 / 0.25e-6, 5e-3);
    assertClose(1.26e-6, MU0, 5e-3);
    assertClose(CA.calc_UOC_max_F_homogeneo(1, 6, 12.5).value, 0.126 * 6 * 12.5);
    assertClose(CA.calc_ISC_max_S_homogeneo(1, 6, 12.5, 1e-5).value, (1.26e-6 * 6 * 12.5) / 1e-5);
  });
});

describe("MPS module calculations", () => {
  const ponto = (over) => Object.assign({}, FIXTURES.PONTOS_DPS.limitador_estimado_5m, over);

  test("SPD point: U_W from Table A.1, estimated ΔU, U_p/f and the applicable C.2.1.9 condition", () => {
    const r = calcularPontoDPS(ponto());
    assert.equal(r.uw, 4); // 220/380 V, category III
    assertClose(r.deltaU.value, 0.25); // 0.1 × 5 kA × 0.5 m
    assertClose(r.upF.value, 1.75);
    assert.equal(r.protecao.condicaoSatisfeita, "b"); // 1.75 ≤ 0.8 × 4
  });
  test("SPD point: a manual U_W overrides Table A.1; missing data returns nothing", () => {
    assert.equal(calcularPontoDPS(ponto({ uwManual: "2" })).uw, 2);
    assert.equal(calcularPontoDPS(ponto({ up: "" })), null);
  });
  test("field evaluation requires an SPDA protection level", () => {
    const a = FIXTURES.baseState();
    assert.equal(calcularAvaliacaoCampo(a, FIXTURES.AVALIACOES_CAMPO[0].c), null);
  });
  test("nearby strike without s_a uses the rolling sphere radius of Table 2", () => {
    const a = FIXTURES.baseState();
    a.protecoes.npSpda = "III";
    const c = Object.assign({}, FIXTURES.AVALIACOES_CAMPO[0].c, { cenario: "proximo", alturaEstrutura: "20", comprimentoEstrutura: "40" });
    const r = calcularAvaliacaoCampo(a, c);
    assertClose(r.sa.value, Math.sqrt(2 * 45 * 20 - 20 * 20));
    assertClose(r.H0_F.value, 100000 / (2 * Math.PI * Math.sqrt(1400)));
  });
});
