// N_G table (NBR 5419-2, Annex F) and the wiring between the modules and the
// browser interface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { NEMAX_MUNICIPIOS } from "../src/data/municipios.js";
import * as engine from "../src/engine/index.js";

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");

test("Table F.1: one row per municipality, all 27 federative units", () => {
  assert.equal(NEMAX_MUNICIPIOS.length, 5572);
  assert.equal(new Set(NEMAX_MUNICIPIOS.map(([nome, uf]) => `${nome}/${uf}`)).size, 5572);
  assert.equal(new Set(NEMAX_MUNICIPIOS.map(([, uf]) => uf)).size, 27);
  for (const [nome, uf, ng] of NEMAX_MUNICIPIOS) {
    assert.ok(typeof nome === "string" && /^[A-Z]{2}$/.test(uf) && Number.isFinite(ng) && ng >= 0, `${nome}/${uf}`);
  }
});

test("Table F.1: sample N_G values (flashes/km²/year)", () => {
  const ng = (nome, uf) => NEMAX_MUNICIPIOS.find((r) => r[0] === nome && r[1] === uf)[2];
  assert.equal(ng("Pirassununga", "SP"), 16);
  assert.equal(ng("Ribeirão Preto", "SP"), 16);
  assert.equal(ng("Curitiba", "PR"), 14);
  assert.equal(ng("Manaus", "AM"), 32);
  assert.equal(ng("Brasília", "DF"), 16);
});

test("index.html loads the engine module before the interface script, with no inline code", () => {
  const html = ler("index.html");
  const modulo = html.indexOf('<script type="module" src="src/main.js"></script>');
  const app = html.indexOf('<script defer src="js/app.js"></script>');
  assert.ok(modulo > 0 && app > modulo);
  assert.equal((html.match(/<script/g) || []).length, 2);
});

test("src/main.js publishes every engine export the interface uses", () => {
  const main = ler("src/main.js");
  const bloco = main.slice(main.indexOf("Object.assign(window, {"));
  for (const nome of Object.keys(engine)) {
    assert.match(bloco, new RegExp(`\\b${nome},`), `${nome} is not published on window`);
  }
});

test("the interface script no longer defines calculation code", () => {
  const app = ler("js/app.js");
  for (const nome of ["NEMAX_CALC", "NEMAX_CALC_P3", "NEMAX_CALC_P4", "NEMAX_CALC_P4_CAMPO", "NEMAX_CALC_R4", "NEMAX_MUNICIPIOS", "Calculo"]) {
    assert.doesNotMatch(app, new RegExp(`^const ${nome} =`, "m"));
  }
  for (const nome of ["calcularR4", "calcularQuantitativoMateriais", "calcularPontoDPS", "calcularAvaliacaoCampo"]) {
    assert.doesNotMatch(app, new RegExp(`function ${nome}\\(`));
  }
});
