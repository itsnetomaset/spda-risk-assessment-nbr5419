// The ES modules must reproduce, exactly, what the original single-file app
// calculated for the same inputs (see test/characterization/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import * as engine from "../src/engine/index.js";
import { runAll } from "./characterization/scenarios.js";

const baseline = JSON.parse(readFileSync(new URL("./characterization/baseline.json", import.meta.url), "utf8"));

/* The baseline was recorded in Chromium. Node and Chromium ship different
   versions of V8, whose Math.tan, Math.cbrt and Math.pow can differ in the last bit
   (for example 13.671629640074226 vs 13.671629640074228). Numbers are
   therefore compared with a relative tolerance of 1e-12, far below any
   engineering significance; everything else (texts, flags, structure) must be
   identical. In Chromium the refactored app reproduces the baseline bit for bit. */
const TOLERANCIA = 1e-12;

function assertMesmoResultado(atual, esperado, caminho = "$") {
  if (typeof esperado === "number" && typeof atual === "number") {
    const escala = Math.max(Math.abs(atual), Math.abs(esperado), Number.MIN_VALUE);
    assert.ok(Math.abs(atual - esperado) / escala <= TOLERANCIA, `${caminho}: ${atual} != ${esperado}`);
    return;
  }
  if (esperado === null || typeof esperado !== "object") {
    assert.equal(atual, esperado, caminho);
    return;
  }
  assert.equal(Array.isArray(atual), Array.isArray(esperado), `${caminho}: array vs object`);
  assert.ok(atual !== null && typeof atual === "object", `${caminho}: expected an object`);
  assert.deepEqual(Object.keys(atual).sort(), Object.keys(esperado).sort(), `${caminho}: keys`);
  for (const k of Object.keys(esperado)) assertMesmoResultado(atual[k], esperado[k], `${caminho}.${k}`);
}

const atual = runAll({
  ...engine,
  executarAnalise: (a) => engine.Calculo.executar(a),
});

test("baseline covers every scenario that runs", () => {
  assert.deepEqual(Object.keys(atual.analises), Object.keys(baseline.analises));
  assert.deepEqual(Object.keys(atual.pontosDPS), Object.keys(baseline.pontosDPS));
  assert.equal(atual.avaliacoesCampo.length, baseline.avaliacoesCampo.length);
});

for (const nome of Object.keys(baseline.analises)) {
  test(`full analysis matches the original app: ${nome}`, () => {
    assertMesmoResultado(atual.analises[nome], baseline.analises[nome]);
  });
}

for (const nome of Object.keys(baseline.pontosDPS)) {
  test(`SPD point matches the original app: ${nome}`, () => {
    assertMesmoResultado(atual.pontosDPS[nome], baseline.pontosDPS[nome]);
  });
}

test("magnetic field evaluations match the original app", () => {
  baseline.avaliacoesCampo.forEach((esperado, i) => {
    assertMesmoResultado(atual.avaliacoesCampo[i], esperado, `avaliacoesCampo[${i}]`);
  });
});

for (const parte of Object.keys(baseline.sweeps)) {
  test(`engine sweep matches the original app: ${parte}`, () => {
    assertMesmoResultado(atual.sweeps[parte], baseline.sweeps[parte], parte);
  });
}

test("N_G municipality table is unchanged", () => {
  assert.deepEqual(atual.municipios, baseline.municipios);
});
