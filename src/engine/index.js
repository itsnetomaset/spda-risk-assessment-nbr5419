/* Single import point for the calculation engine (used by the tests and by any
   other consumer outside the browser app). */
export { NEMAX_MUNICIPIOS } from "../data/municipios.js";
export { NEMAX_CALC } from "./nbr5419-2.js";
export { NEMAX_CALC_R4 } from "./nbr5419-2-anexo-d.js";
export { NEMAX_CALC_P3 } from "./nbr5419-3.js";
export { NEMAX_CALC_P4 } from "./nbr5419-4.js";
export { NEMAX_CALC_P4_CAMPO } from "./nbr5419-4-anexo-a.js";
export { Calculo, calcularR4 } from "./analise-risco.js";
export { calcularPontoDPS, calcularAvaliacaoCampo } from "./mps.js";
export { calcularQuantitativoMateriais } from "./quantitativo-materiais.js";
