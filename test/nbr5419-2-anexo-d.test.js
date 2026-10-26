// ABNT NBR 5419-2:2026, Annex D: loss of economic value (L4) and cost of protection.
import { test } from "node:test";
import assert from "node:assert/strict";

import { NEMAX_CALC_R4 as R4 } from "../src/engine/nbr5419-2-anexo-d.js";
import { assertClose, values } from "./helpers.js";

test("Table D.2, typical L_T, L_F and L_O for loss L4 (different from Table C.2)", () => {
  assert.deepEqual(values(R4.TABELA_D2_L4.LT), [0.01]);
  assert.deepEqual(values(R4.TABELA_D2_L4.LF), [1, 0.5, 0.2, 0.1]);
  assert.deepEqual(values(R4.TABELA_D2_L4.LO), [0.1, 0.01, 0.001, 0.0001]);
});

test("D.1.2, representative tolerable risk R_T4 = 10⁻³", () => {
  assert.equal(R4.RT4_REPRESENTATIVO, 1e-3);
});

test("Table D.1, Eq. (D.1) to (D.4): L4 with real values per zone", () => {
  assertClose(R4.calc_LA4_LU4(0.01, 0.01, 10, 100, false).value, 1e-5);
  assertClose(R4.calc_LB4_LV4(0.5, 0.01, 0.2, 1, 2, 3, 4, 20, false).value, 0.5 * 0.01 * 0.2 * 0.5);
  assertClose(R4.calc_LC4_LM4_LW4_LZ4(0.01, 5, 20, false).value, 0.0025);
});

test("Table D.1, note a: with the representative R_T4 the value ratios are replaced by 1", () => {
  assertClose(R4.calc_LA4_LU4(0.01, 0.01, 10, 100, true).value, 1e-4);
  assertClose(R4.calc_LB4_LV4(0.5, 0.01, 0.2, 1, 2, 3, 4, 20, true).value, 0.001);
  assertClose(R4.calc_LC4_LM4_LW4_LZ4(0.01, 5, 20, true).value, 0.01);
});

test("D.1.4, R4 adds only the components that were evaluated", () => {
  const r = R4.calc_R4_total({ RA4: null, RB4: { value: 1e-4 }, RC4: { value: 2e-5 } });
  assertClose(r.value, 1.2e-4);
  assertClose(R4.calc_R4_componente(0.01, 0.2, 0.005, "RB4", "").value, 1e-5);
});

test("Eq. (D.8) C_L = R4 · c_t, Eq. (D.10) C_RL = R'4 · c_t, Eq. (D.11) C_PM = C_P · (i + a + m)", () => {
  assert.equal(R4.calc_CL(1e-3, 1e6).value, 1000);
  assertClose(R4.calc_CRL(1e-4, 1e6).value, 100);
  assertClose(R4.calc_CPM(10000, 0.1, 0.05, 0.01).value, 1600);
});

test("Eq. (D.12) S_M = C_L − (C_PM + C_RL); D.2.3/D.2.4 protection is justified when C_L ≥ C_RL + C_PM", () => {
  const sm = R4.calc_SM(1000, 600, 100);
  assert.equal(sm.value, 300);
  assert.equal(sm.justificado, true);
  assert.equal(R4.calc_SM(500, 600, 100).justificado, false);
  assert.equal(R4.avaliarJustificativaCusto(1000, 100, 600).justificado, true);
  assert.equal(R4.avaliarJustificativaCusto(700, 100, 600).justificado, true);
  assert.equal(R4.avaliarJustificativaCusto(500, 100, 600).justificado, false);
});
