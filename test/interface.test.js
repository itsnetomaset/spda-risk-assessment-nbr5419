// The interface script (js/app.js) is a classic browser script. It is loaded
// here in a Node vm context with the engine globals that src/main.js publishes
// and a minimal document/localStorage stub, to test the logic it owns.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

import * as engine from "../src/engine/index.js";

function carregarInterface() {
  const contexto = vm.createContext({
    ...engine,
    document: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
  });
  const codigo = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  vm.runInContext(`${codigo}\n;globalThis.__expor = { moduloCompleto, novoEstadoAnalise, MODULOS };`, contexto);
  return contexto.__expor;
}

const { moduloCompleto, novoEstadoAnalise, MODULOS } = carregarInterface();

test("the interface script loads with the engine globals and exposes the 11 modules", () => {
  assert.equal(MODULOS.length, 11);
});

test("atmospheric module is complete once N_G is a number, including N_G = 0 (Fernando de Noronha, Table F.1)", () => {
  const idx = MODULOS.findIndex((m) => m.id === "atmosferico");
  const a = novoEstadoAnalise();
  assert.equal(moduloCompleto(a, idx), false);
  a.atmosferico.ng = 0;
  assert.equal(moduloCompleto(a, idx), true);
  a.atmosferico.ng = 16;
  assert.equal(moduloCompleto(a, idx), true);
});
