/*
 * Browser entry point.
 *
 * The calculation engine lives in ES modules (src/engine) so it can be tested
 * in Node. The interface (js/app.js) is a classic script that refers to the
 * engine by its original global names, so this file publishes them on window.
 * index.html loads this module before js/app.js; both are deferred and run in
 * document order.
 */
import { NEMAX_CALC } from "./engine/nbr5419-2.js";
import { NEMAX_CALC_P3 } from "./engine/nbr5419-3.js";

Object.assign(window, {
  NEMAX_CALC,
  NEMAX_CALC_P3,
});
