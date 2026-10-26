// ABNT NBR 5419-3:2026, physical damage to structures: SPDA sizing.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { NEMAX_CALC_P3 as P3 } from "../src/engine/nbr5419-3.js";
import { calcularQuantitativoMateriais } from "../src/engine/quantitativo-materiais.js";
import { FIXTURES } from "./characterization/scenarios.js";
import { assertClose } from "./helpers.js";

const T = P3.tabelas;
const NPS = ["I", "II", "III", "IV"];

describe("tables", () => {
  test("Table 2: rolling sphere radius and mesh size per protection level", () => {
    assert.deepEqual(
      NPS.map((np) => [T.TABELA2_NP[np].raioEsfera, T.TABELA2_NP[np].malha]),
      [[20, 5], [30, 10], [45, 15], [60, 20]],
    );
  });
  test("Table 5: typical distance between down conductors", () => {
    assert.deepEqual(T.TABELA5_DIST_DESCIDA, { I: 10, II: 10, III: 15, IV: 20 });
  });
  test("Tables 11 and 12: k_i per protection level and k_m per insulating material", () => {
    assert.deepEqual(T.TABELA11_KI, { I: 0.08, II: 0.06, III: 0.04, IV: 0.04 });
    assert.deepEqual(T.TABELA12_KM, { ar: 1, solido: 0.5 });
  });
  test("Table 13: simplified k_c by number of down conductors", () => {
    assert.deepEqual([1, 2, 3, 10].map((n) => P3.tabela13_kc(n).value), [1, 0.66, 0.44, 0.44]);
  });
  test("Table 7: minimum cross-section of air-termination and down conductors", () => {
    const secao = (material, config) => T.TABELA7_CONDUTORES.find((r) => r.material === material && r.config === config).secaoMM2;
    assert.equal(secao("Cobre", "Cilíndrico maciço"), 35);
    assert.equal(secao("Alumínio", "Cilíndrico maciço"), 70);
    assert.equal(secao("Aço zincado a quente", "Cilíndrico maciço"), 50);
    assert.equal(secao("Cobre", "Captor vertical maciço"), 200);
  });
  test("Tables 9 and 10: minimum cross-section of bonding conductors", () => {
    assert.deepEqual(T.TABELA9_EQUIPOTENCIAL_BARRAS, { cobre: 16, acoCobreado: 16, aluminio: 25, acoZincado: 50 });
    assert.deepEqual(T.TABELA10_EQUIPOTENCIAL_INTERNAS, { cobre: 6, aluminio: 10, acoZincado: 16 });
  });
});

describe("protection angle (Figure 1)", () => {
  test("reads the digitized curve at its vertices", () => {
    assert.equal(P3.calc_anguloProtecao("I", 2).value, 68.15);
    assert.equal(P3.calc_anguloProtecao("I", 8.11).value, 49.71);
    assert.equal(P3.calc_anguloProtecao("IV", 2).value, 77.98);
  });
  test("5.3.2.13: below 2 m the angle does not change", () => {
    for (const np of NPS) assert.equal(P3.calc_anguloProtecao(np, 0.5).value, P3.calc_anguloProtecao(np, 2).value);
  });
  test("for the same height, a lower protection level allows a wider angle", () => {
    for (const h of [2, 10, 20]) {
      const a = NPS.map((np) => P3.calc_anguloProtecao(np, h).value);
      assert.ok(a[0] < a[1] && a[1] < a[2] && a[2] < a[3], `H = ${h} m: ${a}`);
    }
  });
  test("the angle decreases as the height increases", () => {
    for (const np of NPS) {
      let anterior = Infinity;
      for (let h = 2; h <= T.TABELA2_NP[np].raioEsfera; h += 0.5) {
        const a = P3.calc_anguloProtecao(np, h).value;
        assert.ok(a < anterior, `NP ${np}, H = ${h} m`);
        anterior = a;
      }
    }
  });
  test("protection radius at ground level r = H · tan(α)", () => {
    const r = P3.calc_anguloProtecao("II", 10);
    assertClose(r.raioProtecaoBase, 10 * Math.tan((r.value * Math.PI) / 180));
  });
  test("5.3.2.11: above the rolling sphere radius only the sphere and mesh methods apply", () => {
    for (const np of NPS) {
      const hmax = T.TABELA2_NP[np].raioEsfera;
      assert.equal(P3.calc_anguloProtecao(np, hmax).aplicavel, true);
      assert.equal(P3.calc_anguloProtecao(np, hmax + 0.01).aplicavel, false);
    }
  });
});

describe("earth termination (5.5.2.3, Figure 3)", () => {
  test("levels III and IV: l1 = 0 regardless of soil resistivity", () => {
    for (const rho of [0, 500, 3000]) {
      assert.equal(P3.calc_comprimentoMinEletrodo("III", rho).value, 0);
      assert.equal(P3.calc_comprimentoMinEletrodo("IV", rho).value, 0);
    }
  });
  test("Eq. (1a), level I: l1 = 0.03 · ρ − 10 (not below zero)", () => {
    assertClose(P3.calc_comprimentoMinEletrodo("I", 1000).value, 20);
    assert.equal(P3.calc_comprimentoMinEletrodo("I", 200).value, 0);
  });
  test("Eq. (1b), level II: l1 = 0.02 · ρ − 11 (not below zero)", () => {
    assertClose(P3.calc_comprimentoMinEletrodo("II", 1000).value, 9);
    assert.equal(P3.calc_comprimentoMinEletrodo("II", 500).value, 0);
  });
  test("Eq. (1): ring electrode radius r_e = √(A/π); no extra electrodes when r_e ≥ l1", () => {
    assertClose(P3.calc_raioEquivalenteEletrodo(100 * Math.PI).value, 10);
    assert.equal(P3.calc_dispensaComplementacao(10, 10).value, true);
    assert.equal(P3.calc_dispensaComplementacao(9.9, 10).value, false);
  });
  test("Eq. (2) and (3): radial l_r = l1 − r_e, vertical l_v = (l1 − r_e)/2", () => {
    const c = P3.calc_eletrodoComplementar(5, 20);
    assert.equal(c.lr.value, 15);
    assert.equal(c.lv.value, 7.5);
  });
});

describe("down conductors (5.4.3, Table 5)", () => {
  test("n = ceil(perimeter / distance), never fewer than two", () => {
    assert.equal(P3.calc_numeroMinDescidas(60, "III").value, 4);
    assert.equal(P3.calc_numeroMinDescidas(61, "III").value, 5);
    assert.equal(P3.calc_numeroMinDescidas(10, "IV").value, 2);
    assert.equal(P3.calc_numeroMinDescidas(200, "I").value, 20);
  });
  test("actual spacing = perimeter / n", () => {
    assert.equal(P3.calc_espacamentoReal(60, 4).value, 15);
  });
});

describe("separation distance (6.3) and k_c (Annex C)", () => {
  test("C.3.1: one down conductor, k_c = 1", () => {
    assert.equal(P3.calc_kc_umaDescida().value, 1);
  });
  test("C.3.2: two down conductors, k_c = (h + c)/(2h + c)", () => {
    assertClose(P3.calc_kc_duasDescidas(10, 15).value, 25 / 35);
  });
  test("C.3.3: three down conductors, strike on the central one, k_c = (h + c)/(3h + c)", () => {
    assertClose(P3.calc_kc_tresDescidasCentral(10, 15).value, 25 / 45);
  });
  test("C.3.4: four or more down conductors, k_c = 1/(2n) + 0.1 + 0.2 · ∛(c/h)", () => {
    assertClose(P3.calc_kc_multiplasDescidas(4, 10, 10).value, 0.125 + 0.1 + 0.2);
    assert.equal(P3.calc_kc_multiplasDescidas(3, 10, 10).aplicavel, false);
  });
  test("C.3.4.1: warns when h or c is outside 3 to 20 m", () => {
    assert.equal(P3.calc_kc_multiplasDescidas(4, 10, 10).avisoFaixa, false);
    assert.equal(P3.calc_kc_multiplasDescidas(4, 25, 10).avisoFaixa, true);
    assert.equal(P3.calc_kc_multiplasDescidas(4, 10, 2).avisoFaixa, true);
  });
  test("Eq. (5): s = (k_i / k_m) · k_c · l", () => {
    assertClose(P3.calc_distanciaSeguranca_simplificada("I", "ar", 0.44, 10).value, 0.08 * 0.44 * 10);
    assertClose(P3.calc_distanciaSeguranca_simplificada("I", "solido", 0.44, 10).value, (0.08 / 0.5) * 0.44 * 10);
  });
  test("Eq. (4): s = (k_i / k_m) · Σ k_c,i · l_i", () => {
    const s = P3.calc_distanciaSeguranca_completa("II", "ar", [{ kc: 0.44, l: 10 }, { kc: 0.25, l: 4 }]);
    assertClose(s.value, 0.06 * (4.4 + 1));
  });
  test("the k_c case chosen in the sizing module is resolved to the matching formula", () => {
    assertClose(P3.resolverKc({ casoKc: "2", kcH: "10", kcC: "15" }).value, 25 / 35);
    assert.equal(P3.resolverKc({ casoKc: "tabela13", kcN: "2" }).value, 0.66);
    assert.equal(P3.resolverKc({ casoKc: "manual", kcManual: "0.33" }).value, 0.33);
    assert.equal(P3.resolverKc({ casoKc: "2", kcH: "", kcC: "15" }), null);
  });
});

describe("Annex B: shielded incoming lines", () => {
  test("S_c,min = I_F · ρ_c · L_c · 10⁶ / U_W", () => {
    assertClose(P3.calc_secaoMinBlindagem(50, 1.7e-8, 200, 2.5).value, (50 * 1.7e-8 * 200 * 1e6) / 2.5);
  });
  test("Table B.1: L_c ≤ 8 · √ρ for a shield in contact with soil", () => {
    assert.equal(P3.calc_comprimentoLinhaBlindagem_aterrada(400).value, 160);
  });
  test("B.4: current limits I_F = 8 · S_c and I_F = 8 · n' · S'_c", () => {
    assert.equal(P3.calc_correnteLimiteBlindagemCobre(16).value, 128);
    assert.equal(P3.calc_correnteLimiteCondutoresNaoBlindados(4, 10).value, 320);
  });
});

describe("material estimate", () => {
  test("is only produced when an SPDA protection level is selected", () => {
    assert.equal(calcularQuantitativoMateriais(FIXTURES.baseState()), null);
  });
  test("down conductors: number of conductors × building height", () => {
    const a = FIXTURES.baseState();
    a.protecoes.npSpda = "III";
    const itens = calcularQuantitativoMateriais(a);
    const descida = itens.find((i) => i.grupo === "Descida" && i.unidade === "m");
    // perimeter 2 × (20 + 10) = 60 m → 4 down conductors (Table 5, 15 m) × 6 m
    assert.equal(descida.quantidade, 24);
  });
});
