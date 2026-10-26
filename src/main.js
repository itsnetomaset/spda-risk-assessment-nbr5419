/*
 * Browser entry point.
 *
 * The calculation engine lives in ES modules (src/engine) so it can be tested
 * in Node. The interface (js/app.js) is a classic script that refers to the
 * engine by its original global names, so this file publishes them on window.
 * index.html loads this module before js/app.js; both are deferred and run in
 * document order.
 */
import { NEMAX_MUNICIPIOS } from "./data/municipios.js";
import { NEMAX_CALC } from "./engine/nbr5419-2.js";
import { NEMAX_CALC_R4 } from "./engine/nbr5419-2-anexo-d.js";
import { Calculo, calcularR4 } from "./engine/analise-risco.js";
import { NEMAX_CALC_P3 } from "./engine/nbr5419-3.js";
import { NEMAX_CALC_P4 } from "./engine/nbr5419-4.js";
import { NEMAX_CALC_P4_CAMPO } from "./engine/nbr5419-4-anexo-a.js";

Object.assign(window, {
  NEMAX_MUNICIPIOS,
  NEMAX_CALC,
  NEMAX_CALC_P3,
  NEMAX_CALC_P4,
  NEMAX_CALC_P4_CAMPO,
  NEMAX_CALC_R4,
  Calculo,
  calcularR4,
});
