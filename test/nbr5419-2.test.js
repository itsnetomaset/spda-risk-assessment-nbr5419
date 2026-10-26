// ABNT NBR 5419-2:2026, risk analysis (Annexes A, B and C, sections 5 to 7).
// Expected values are the normative ones recorded in this project, with the
// clause each one comes from; formula results are worked out by hand here,
// independently of the engine code.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { NEMAX_CALC as P2 } from "../src/engine/nbr5419-2.js";
import { assertClose, values } from "./helpers.js";

const T = P2.tabelas;

describe("Annex A tables", () => {
  test("Table A.1, location factor C_D", () => {
    assert.deepEqual(values(T.A1_CD), [0.25, 0.5, 1, 2]);
  });
  test("Table A.2, line installation factor C_I", () => {
    assert.deepEqual(values(T.A2_CI), [1, 0.5, 0.01]);
  });
  test("Table A.3, line type factor C_T (LV or signal 1, HV with transformer 0.2)", () => {
    assert.deepEqual(values(T.A3_CT), [1, 0.2]);
  });
  test("Table A.4, line environmental factor C_E", () => {
    assert.deepEqual(values(T.A4_CE), [1, 0.5, 0.1, 0.01]);
  });
});

describe("Annex A equations: collection areas and number of dangerous events", () => {
  test("Eq. (A.1) A_D = L·W + 2·3H·(L+W) + π·(3H)²", () => {
    // 20 × 10 × 6 m: 200 + 36 × 30 + π × 18²
    assertClose(P2.calc_AD(20, 10, 6).value, 200 + 1080 + Math.PI * 324);
  });
  test("Eq. (A.2) A_D' = π·(3·H_P)²", () => {
    assertClose(P2.calc_ADlinha(5).value, Math.PI * 225);
  });
  test("Eq. (A.3) N_D = N_G · A_D · C_D · 10⁻⁶", () => {
    assertClose(P2.calc_ND(16, 2000, 0.5).value, 0.016);
  });
  test("Eq. (A.4) N_DJ = N_G · A_DJ · C_DJ · C_T · 10⁻⁶", () => {
    assertClose(P2.calc_NDJ(16, 5000, 0.5, 0.2).value, 0.008);
  });
  test("Eq. (A.6) A_M = 2·500·(L+W) + π·500²", () => {
    assertClose(P2.calc_AM(20, 10).value, 30000 + Math.PI * 250000);
  });
  test("Eq. (A.5) N_M = N_G · A_M · 10⁻⁶", () => {
    assertClose(P2.calc_NM(10, 1e6).value, 10);
  });
  test("Eq. (A.8) A_L = 40 · L_L and Eq. (A.10) A_I = 4000 · L_L", () => {
    assert.equal(P2.calc_AL(1000).value, 40000);
    assert.equal(P2.calc_AI(1000).value, 4000000);
  });
  test("Eq. (A.7) N_L and Eq. (A.9) N_I = N_G · A · C_I · C_E · C_T · 10⁻⁶", () => {
    // aerial LV line, 1 km, rural, N_G = 16
    assertClose(P2.calc_NL(16, 40000, 1, 1, 1).value, 0.64);
    assertClose(P2.calc_NI(16, 4000000, 1, 1, 1).value, 64);
    // buried, urban, HV line with transformer
    assertClose(P2.calc_NL(16, 40000, 0.5, 0.1, 0.2).value, 0.0064);
  });
});

describe("Annex B tables", () => {
  test("Table B.1, P_TA", () => {
    assert.deepEqual(values(T.B1_PTA), [1, 0.1, 0.01, 0.01, 0.001, 0]);
  });
  test("Table B.2, P_B by protection level of the SPDA", () => {
    const pb = Object.fromEntries(T.B2_PB.slice(0, 5).map((r) => [r.np ?? "none", r.value]));
    assert.deepEqual(pb, { none: 1, IV: 0.2, III: 0.1, II: 0.05, I: 0.02 });
    assert.deepEqual(values(T.B2_PB.slice(5)), [0.01, 0.001]);
  });
  test("Table B.3, P_SPD, and Table B.7, P_EB", () => {
    assert.deepEqual(values(T.B3_PSPD).slice(0, 4), [1, 0.05, 0.02, 0.01]);
    assert.deepEqual(values(T.B7_PEB).slice(0, 4), [1, 0.05, 0.02, 0.01]);
  });
  test("Table B.4, C_LD and C_LI", () => {
    assert.deepEqual(T.B4_CLD_CLI.map((r) => [r.cld, r.cli]), [
      [1, 1], [1, 1], [1, 0.2], [1, 0.3], [1, 0.1], [1, 0], [0, 0], [0, 0], [0, 0],
    ]);
  });
  test("Table B.5, K_S3", () => {
    assert.deepEqual(values(T.B5_KS3), [1, 0.5, 0.2, 0.01, 0.0001]);
  });
  test("Table B.6, P_TU", () => {
    assert.deepEqual(values(T.B6_PTU), [1, 0.1, 0.01, 0]);
  });
  test("Table B.8, P_LD by shield resistance and U_W", () => {
    assert.deepEqual(T.B8_PLD.uw_kv, [0.35, 0.5, 1, 1.5, 2.5, 4, 6]);
    assert.deepEqual(T.B8_PLD.linhas[0].valores, [1, 1, 1, 1, 1, 1, 1]);
    assert.deepEqual(T.B8_PLD.linhas[3].valores, [1, 0.85, 0.6, 0.4, 0.2, 0.04, 0.02]);
  });
  test("Table B.9, P_LI by line type and U_W", () => {
    assert.deepEqual(T.B9_PLI.uw_kv, [1, 1.5, 2.5, 4, 6]);
    assert.deepEqual(T.B9_PLI.linhas[0].valores, [1, 0.6, 0.3, 0.16, 0.1]);
    assert.deepEqual(T.B9_PLI.linhas[1].valores, [1, 0.5, 0.2, 0.08, 0.04]);
  });
  test("Tables B.8 and B.9 are read by exact U_W; any other U_W uses the first, most conservative column", () => {
    assert.equal(P2.interp_tabela_kv(T.B8_PLD, 2.5, 3), 0.2);
    assert.equal(P2.interp_tabela_kv(T.B9_PLI, 4, 1), 0.08);
    assert.equal(P2.interp_tabela_kv(T.B8_PLD, 3, 3), 1);
    assert.equal(P2.interp_tabela_kv(T.B9_PLI, 0.5, 0), 1);
  });
});

describe("Annex B equations: probabilities", () => {
  test("Eq. (B.1) P_A = P_TA · P_B and Eq. (B.2) P_C = P_SPD · C_LD", () => {
    assertClose(P2.calc_PA(0.1, 0.05).value, 0.005);
    assertClose(P2.calc_PC(0.02, 1).value, 0.02);
  });
  test("Eq. (B.5)/(B.6) K_S1 = K_S2 = 0.12 · w_m, at most 1", () => {
    assertClose(P2.calc_KS1_KS2(5).value, 0.6);
    assert.equal(P2.calc_KS1_KS2(10).value, 1);
    assert.equal(P2.calc_KS1_KS2(0).value, 0);
  });
  test("Eq. (B.7) K_S4 = 1/U_W, at most 1", () => {
    assertClose(P2.calc_KS4(2.5).value, 0.4);
    assert.equal(P2.calc_KS4(0.35).value, 1);
  });
  test("Eq. (B.4) P_MS = (K_S1 · K_S2 · K_S3 · K_S4)² and Eq. (B.3) P_M = P_SPD · P_MS", () => {
    const pms = P2.calc_PMS(0.6, 0.6, 1, 0.4).value;
    assertClose(pms, (0.6 * 0.6 * 0.4) ** 2);
    assertClose(P2.calc_PM(0.05, pms).value, 0.05 * 0.020736);
  });
  test("Eq. (B.8) to (B.11): P_U, P_V, P_W, P_Z", () => {
    assertClose(P2.calc_PU(0.1, 0.05, 0.6, 1).value, 0.003);
    assertClose(P2.calc_PV(0.05, 0.6, 1).value, 0.03);
    assertClose(P2.calc_PW(0.02, 0.6, 1).value, 0.012);
    assertClose(P2.calc_PZ(0.02, 0.3, 0.2).value, 0.0012);
  });
});

describe("Annex C: loss values", () => {
  test("Table C.2, typical L_T, L_F and L_O for loss L1", () => {
    assert.deepEqual(values(T.C2_L1.LT), [0.01, 0.1]);
    assert.deepEqual(values(T.C2_L1.LF), [0.1, 0.05, 0.02, 0.01]);
    assert.deepEqual(values(T.C2_L1.LO), [0.1, 0.01, 0.001]);
  });
  test("Tables C.3 to C.7: r_t, r_p, r_f, h_z, r_s", () => {
    assert.deepEqual(values(T.C3_RT), [1e-2, 1e-3, 1e-4, 1e-5]);
    assert.deepEqual(values(T.C4_RP), [1, 0.5, 0.2]);
    assert.deepEqual(values(T.C5_RF), [1, 0.1, 0.001, 0.1, 0.01, 0.001, 0]);
    assert.deepEqual(values(T.C6_HZ), [1, 2, 5, 5, 10]);
    assert.deepEqual(values(T.C7_RS), [2, 1]);
  });
  test("Eq. (C.1)/(C.2) L_A = r_t · L_T · (n_z/n_t) · (t_z/8760) · r_s", () => {
    assertClose(P2.calc_LA(0.01, 0.01, 10, 40, 4380, 2).value, 0.01 * 0.01 * 0.25 * 0.5 * 2);
  });
  test("Eq. (C.3) L_B = r_p · r_f · h_z · L_F · (n_z/n_t) · (t_z/8760) · r_s", () => {
    assertClose(P2.calc_LB(0.5, 0.01, 2, 0.02, 1, 1, 8760, 1).value, 0.0002);
  });
  test("Eq. (C.4) L_C = L_O · (n_z/n_t) · (t_z/8760) · r_s", () => {
    assertClose(P2.calc_LC(0.001, 50, 100, 8760, 1).value, 0.0005);
  });
  test("presence time t_z is limited to the 8760 h of a year", () => {
    assert.equal(P2.calc_LA(0.01, 0.01, 1, 1, 10000, 1).value, P2.calc_LA(0.01, 0.01, 1, 1, 8760, 1).value);
  });
  test("Eq. (C.7) loss of cultural heritage L_B = r_p · r_f · L_F · (c_z/c_t)", () => {
    assertClose(P2.calc_L3(0.5, 0.1, 0.1, 1, 4).value, 0.00125);
  });
});

describe("Sections 5 to 7: risk components, tolerable risk and frequency of damage", () => {
  test("Table 4, tolerable risk: R_T = 10⁻⁵ for L1 and 10⁻⁴ for L3", () => {
    assert.equal(P2.constantes.RT1, 1e-5);
    assert.equal(P2.constantes.RT3, 1e-4);
  });
  test("7.3.4, tolerable frequency F_T = 0.1 for critical internal systems", () => {
    assert.equal(P2.constantes.FT_CRITICO, 0.1);
    assert.equal(P2.constantes.FT_NAO_CRITICO, 1);
  });
  test("each risk component is R = N · P · L; each frequency component is F = N · P", () => {
    assertClose(P2.calc_R(0.04, 0.1, 2e-4, "R_B", 5, "").value, 8e-7);
    assertClose(P2.calc_F(0.04, 0.02, "F_C", 15).value, 8e-4);
  });
});
