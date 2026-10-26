// Complete risk analysis (Calculo.executar) and economic risk (calcularR4),
// checked against results worked out step by step from NBR 5419-2:2026.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { Calculo, calcularR4 } from "../src/engine/analise-risco.js";
import { FIXTURES } from "./characterization/scenarios.js";
import { assertClose } from "./helpers.js";

const analise = (patch) => {
  const a = FIXTURES.baseState();
  for (const [k, v] of Object.entries(patch || {})) Object.assign(a[k], v);
  return a;
};

describe("worked example: house 20 × 10 × 6 m, N_G = 16, isolated (C_D = 1), no lines", () => {
  // Eq. (A.1): A_D = 200 + 1080 + 324π;  Eq. (A.3): N_D = 16 · A_D · 1 · 10⁻⁶
  const AD = 200 + 1080 + 324 * Math.PI;
  const ND = 16 * AD * 1e-6;
  // Eq. (C.1): L_A = r_t(0.01) · L_T(0.01) · 1 · 1 · r_s(2) = 2·10⁻⁴
  // Eq. (C.3): L_B = r_p(1) · r_f(0.01) · h_z(1) · L_F(0.01, "outros") · 1 · 1 · r_s(2) = 2·10⁻⁴
  const LA = 2e-4, LB = 2e-4;

  test("without protection R1 = R_A + R_B = N_D · 1 · L_A + N_D · 1 · L_B exceeds R_T = 10⁻⁵", () => {
    const r = Calculo.executar(analise());
    assertClose(r.AD, AD);
    assertClose(r.ND, ND);
    assertClose(r.componentesR.RA, ND * 1 * LA);
    assertClose(r.componentesR.RB, ND * 1 * LB);
    assertClose(r.R1, ND * (LA + LB)); // 1.4706 × 10⁻⁵
    assert.equal(r.conformeR1, false);
    assert.equal(r.conforme, false);
  });

  test("an SPDA of protection level III (P_B = 0.1, Table B.2) brings R1 below R_T", () => {
    const r = Calculo.executar(analise({ protecoes: { npSpda: "III" } }));
    // P_A = P_TA(1) · P_B(0.1)
    assertClose(r.componentesR.RA, ND * 0.1 * LA);
    assertClose(r.componentesR.RB, ND * 0.1 * LB);
    assertClose(r.R1, ND * 0.1 * (LA + LB)); // 1.4706 × 10⁻⁶
    assert.equal(r.conformeR1, true);
  });

  test("components R_C and R_M (internal systems) only enter R1 for hospitals or explosion risk", () => {
    assert.deepEqual(Object.keys(Calculo.executar(analise()).componentesR).sort(), ["RA", "RB"]);
    const hosp = Calculo.executar(analise({ estrutura: { tipo: "Hospitalar" } }));
    assert.deepEqual(Object.keys(hosp.componentesR).sort(), ["RA", "RB", "RC", "RM"]);
  });

  test("R3 is only evaluated for cultural heritage", () => {
    assert.equal(Calculo.executar(analise()).R3, 0);
    const r = Calculo.executar(analise({ estrutura: { patrimonioCultural: true } }));
    // Eq. (C.7) with c_z/c_t = 1: L_B(L3) = r_p(1) · r_f(0.01) · L_F(0.01) = 10⁻⁴; R_B(L3) = N_D · P_B(1) · 10⁻⁴
    assertClose(r.R3, ND * 1e-4);
    assert.equal(r.conformeR3, true);
  });
});

describe("worked example: one aerial LV line, 1 km, rural, sources S1 to S3", () => {
  test("R_U and R_V use N_L = N_G · 40 · L_L · C_I · C_E · C_T · 10⁻⁶ (Eq. A.7, A.8)", () => {
    const a = analise({ fontesDano: { S3: true } });
    a.linhas.energia.push({ comprimento: 1000, instalacao: "aerea", ambiente: 1, tipoLinha: 1 });
    const r = Calculo.executar(a);
    const NL = 16 * 40 * 1000 * 1 * 1 * 1 * 1e-6; // 0.64 / year
    assertClose(r.NL_total, NL);
    assertClose(r.NI_total, NL * 100); // A_I = 4000 · L_L
    // no protection, unshielded line: P_U = P_TU · P_EB · P_LD · C_LD = 1; P_V = 1
    assertClose(r.componentesR.RU, NL * 1 * 2e-4);
    assertClose(r.componentesR.RV, NL * 1 * 2e-4);
  });

  test("the calculation memory cites the clause of every step", () => {
    const r = Calculo.executar(analise());
    assert.ok(r.memoria.length > 10);
    for (const passo of r.memoria) assert.match(passo.norma, /ABNT NBR 5419-2:2026/);
  });
});

describe("Annex D: economic risk R4 and cost-benefit", () => {
  const comR4 = (economico) => {
    const a = analise({ economico: Object.assign({ avaliar: true, lfCategoria: "2", loCategoria: "1" }, economico) });
    Calculo.executar(a);
    return calcularR4(a);
  };

  test("R4 is optional: nothing is calculated unless requested", () => {
    const a = analise();
    Calculo.executar(a);
    assert.equal(calcularR4(a), null);
  });

  test("simplified mode (D.1.2): ratios c/c_t = 1; protection lowers R4", () => {
    const a = analise({ protecoes: { npSpda: "II" }, economico: { avaliar: true, lfCategoria: "2", loCategoria: "1" } });
    const r = Calculo.executar(a);
    const r4 = calcularR4(a);
    // Table D.2: L_F = 0.2 (hotel, school, office...), L_O = 0.01; Eq. (D.3): L_B4 = r_p · r_f · L_F · 1
    assertClose(r4.LB4.value, 1 * 0.01 * 0.2);
    assertClose(r4.LC4.value, 0.01);
    // with protection: R_B4 = N_D · P_B(0.05) · L_B4; without: P_B = 1
    assertClose(r4.componentesCom.RB4.value, r.ND * 0.05 * 0.002);
    assertClose(r4.componentesSem.RB4.value, r.ND * 1 * 0.002);
    assert.ok(r4.R4_com.value < r4.R4_sem.value);
  });

  test("Eq. (D.8) to (D.12): C_L, C_RL, C_PM and S_M", () => {
    const r4 = comR4({ ctSimplificado: "1000000", custoProtecao: "20000", taxaJuros: "0.1", taxaAmortizacao: "0.05", taxaManutencao: "0.01" });
    assertClose(r4.CL.value, r4.R4_sem.value * 1e6);
    assertClose(r4.CRL.value, r4.R4_com.value * 1e6);
    assertClose(r4.CPM.value, 20000 * 0.16);
    assertClose(r4.SM.value, r4.CL.value - (r4.CPM.value + r4.CRL.value));
    assert.equal(r4.justificativa.justificado, r4.CL.value >= r4.CRL.value + r4.CPM.value);
  });

  test("full mode without monetary values cannot be evaluated", () => {
    assert.equal(comR4({ modoSimplificado: false, ca: "", cb: "", cc: "", cs: "" }), null);
  });
});
