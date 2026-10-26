/*
 * Characterization scenarios.
 *
 * The same scenarios run in two places:
 *   1. inside the original single-file app (index.html at commit 9aac33e), in a
 *      headless browser, to record test/characterization/baseline.json;
 *   2. against the ES modules in src/, by test/characterization.test.js.
 *
 * Both runs must produce identical results. The file has no imports so it can
 * be loaded unchanged in the browser and in Node.
 *
 * `api` must provide:
 *   NEMAX_CALC, NEMAX_CALC_P3, NEMAX_CALC_P4, NEMAX_CALC_P4_CAMPO, NEMAX_CALC_R4,
 *   NEMAX_MUNICIPIOS, executarAnalise(a), calcularR4(a), calcularPontoDPS(p),
 *   calcularAvaliacaoCampo(a, c), calcularQuantitativoMateriais(a)
 */

/* Analysis state with the same field types the wizard forms store
   (numbers already parsed, as in each module's coletar()). */
function baseState() {
  return {
    id: "an_fixture",
    criadoEm: "2026-01-01T12:00:00.000Z",
    atualizadoEm: "2026-01-01T12:00:00.000Z",
    auditoria: [],
    identificacao: {
      cliente: "Cliente Exemplo", responsavel: "", empresa: "", telefone: "", email: "",
      endereco: "Rua Exemplo", numero: "100", complemento: "", bairro: "Centro", cidade: "Pirassununga", estado: "SP", cep: "",
      latitude: "", longitude: "", dataAnalise: "2026-01-01",
      numeroLaudo: "LD-001/2026", numeroART: "", observacoes: "",
    },
    estrutura: {
      tipo: "Residencial",
      comprimento: 20, largura: 10, altura: 6,
      areaConstruida: 200, areaTotal: 250, numPavimentos: 2,
      numOcupantes: 4, taxaOcupacao: 8760,
      temEstruturaAdjacente: false, distanciaAdjacente: 0, alturaAdjacente: 0,
      areasExternasOcupadas: false, presencaPublico: false, presencaAnimais: false,
      materiaisInflamaveis: false, materiaisExplosivos: false, substanciasPerigosas: false,
      impactoAmbiental: false, patrimonioCultural: false, servicoEssencial: false,
      localizacaoRelativa: 1,
      tipoConstrucao: 2,
      tipoSuperficie: 0.01,
      providenciasIncendio: 1,
      riscoIncendio: 0.01,
      perigoEspecial: 1,
    },
    atmosferico: { estado: "SP", municipio: "Pirassununga", ng: 16, ngOriginal: 16, ngEditadoManualmente: false },
    linhas: { energia: [], sinal: [] },
    fontesDano: { S1: true, S2: true, S3: false, S4: false },
    protecoes: {
      npSpda: "nenhum",
      medidaToquePasso: 1,
      npDPS: "nenhum",
      medidaToqueLinha: 1,
      npDPSClasseI: "nenhum",
      condicaoLinha: 0,
      tensaoSuportavel: 1.5,
      resistenciaBlindagem: 0,
      wm: 10,
      ks3Tipo: 1,
    },
    resultado: null,
    dimensionamento: {
      metodoCaptacao: "esfera", alturaCaptor: "", meioIsolacao: "ar",
      perimetroEstrutura: "", descidaIsolada: false,
      resistividadeSolo: "", areaEletrodo: "",
      casoKc: "1", kcH: "", kcC: "", kcN: "", kcManual: "", sComprimentoL: "",
      materialCaptacao: "Cobre", materialAterramento: "Cobre",
    },
    mps: { zonasIdentificadas: [], pontosDPS: [], avaliacoesCampo: [], interfacesIsolantes: [] },
    economico: {
      avaliar: false, modoSimplificado: true,
      ca: "", cb: "", cc: "", cs: "", ctSimplificado: "",
      lfCategoria: "", loCategoria: "", temAnimaisComerciais: false,
      custoProtecao: "", taxaJuros: "", taxaAmortizacao: "", taxaManutencao: "",
    },
  };
}

function merge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) {
      merge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function state(patch) {
  return merge(baseState(), patch || {});
}

const energiaAerea = (over) => Object.assign({ comprimento: 1000, instalacao: "aerea", ambiente: 0.5, tipoLinha: 1, classeTensao: "", blindada: "nao" }, over || {});
const sinalSub = (over) => Object.assign({ subtipo: "Internet", comprimento: 1000, instalacao: "subterranea", ambiente: 0.5, blindada: "nao" }, over || {});

const pontoDPS = (over) => Object.assign({
  nome: "QDG", servico: "energia", tipoDPS: "limitador",
  faixaFaseTensao: "220 a 254", categoriaProduto: "III", uwManual: "",
  up: "1.5", deltaUModo: "estimado", deltaUCorrenteKA: "5", deltaUComprimentoM: "0.5", deltaUManual: "",
  comprimentoCircuitoM: "5", sistemaCritico: false,
}, over || {});

const avaliacaoCampo = (over) => Object.assign({
  nome: "Sala técnica", cenario: "direto", materialBlindagem: "cobre", wm: "5", malhaEquipotencial: false,
  rc: "", freq25kHz: true, dw: "3", dr: "2", kh: "0.01",
  alturaEstrutura: "", comprimentoEstrutura: "", raioEsferaRolante: "", Sa: "",
  calcularInducao: false, lacoL: "", lacoB: "", lacoRc: "0.005", dlw: "", dlr: "",
}, over || {});

/* ---------- Full-analysis scenarios (Part 2 risk, Annex D, Part 3 quantities) ---------- */
const ANALISES = {
  residencial_sem_protecao: state(),

  residencial_linhas_np3: state({
    linhas: { energia: [energiaAerea({ ambiente: 1 })], sinal: [sinalSub({ comprimento: 300 })] },
    fontesDano: { S1: true, S2: true, S3: true, S4: true },
    protecoes: { npSpda: "III", npDPS: "III-IV", npDPSClasseI: "III-IV", medidaToquePasso: 0.1, condicaoLinha: 2, tensaoSuportavel: 2.5, ks3Tipo: 0.2 },
    dimensionamento: { metodoCaptacao: "malha", resistividadeSolo: "500", areaEletrodo: "200" },
  }),

  hospital_np1_patrimonio: state({
    estrutura: {
      tipo: "Hospitalar", comprimento: 60, largura: 40, altura: 25, numOcupantes: 300, taxaOcupacao: 8760,
      patrimonioCultural: true, tipoConstrucao: 1, tipoSuperficie: 0.001, providenciasIncendio: 0.2, riscoIncendio: 0.1, perigoEspecial: 5,
      localizacaoRelativa: 0.5,
    },
    atmosferico: { estado: "AM", municipio: "Manaus", ng: 32, ngOriginal: 32 },
    linhas: { energia: [energiaAerea({ tipoLinha: 0.2, ambiente: 0.1, comprimento: 500 })], sinal: [sinalSub({ ambiente: 0.1 }), sinalSub({ instalacao: "aerea", comprimento: 2000 })] },
    fontesDano: { S1: true, S2: true, S3: true, S4: true },
    protecoes: { npSpda: "I", npDPS: "I", npDPSClasseI: "I", medidaToquePasso: 0.001, medidaToqueLinha: 0.01, condicaoLinha: 3, tensaoSuportavel: 2.5, resistenciaBlindagem: 3, wm: 5, ks3Tipo: 0.0001 },
    dimensionamento: {
      metodoCaptacao: "malha", perimetroEstrutura: "200", resistividadeSolo: "1000", areaEletrodo: "2400",
      casoKc: "multiplas", kcH: "4", kcC: "10", kcN: "20", materialCaptacao: "Alumínio", materialAterramento: "Aço cobreado",
    },
  }),

  industrial_explosivos_np2: state({
    estrutura: { tipo: "Industrial", comprimento: 80, largura: 30, altura: 12, numOcupantes: 50, taxaOcupacao: 2920, materiaisExplosivos: true, riscoIncendio: 1, providenciasIncendio: 0.5, localizacaoRelativa: 2 },
    atmosferico: { estado: "SP", municipio: "Ribeirão Preto", ng: 16, ngOriginal: 16 },
    linhas: { energia: [energiaAerea({ ambiente: 1, comprimento: 1500 }), energiaAerea({ instalacao: "subterranea", ambiente: 0.5 })], sinal: [] },
    fontesDano: { S1: true, S2: true, S3: true, S4: false },
    protecoes: { npSpda: "II", npDPS: "II", npDPSClasseI: "II", condicaoLinha: 1, tensaoSuportavel: 4, resistenciaBlindagem: 1, ks3Tipo: 0.5, wm: 0 },
    dimensionamento: { metodoCaptacao: "angulo", resistividadeSolo: "1200", areaEletrodo: "50", casoKc: "2", kcH: "12", kcC: "15" },
  }),

  comercial_r4_simplificado: state({
    estrutura: { tipo: "Comercial", comprimento: 30, largura: 15, altura: 9, numOcupantes: 40, taxaOcupacao: 4380, riscoIncendio: 0.01 },
    atmosferico: { estado: "PR", municipio: "Curitiba", ng: 14, ngOriginal: 14 },
    linhas: { energia: [energiaAerea()], sinal: [sinalSub()] },
    fontesDano: { S1: true, S2: true, S3: true, S4: true },
    protecoes: { npSpda: "IV", npDPS: "III-IV", npDPSClasseI: "nenhum", condicaoLinha: 4, tensaoSuportavel: 1, ks3Tipo: 0.01 },
    economico: {
      avaliar: true, modoSimplificado: true, ctSimplificado: "2500000",
      lfCategoria: "2", loCategoria: "1",
      custoProtecao: "45000", taxaJuros: "0.1", taxaAmortizacao: "0.05", taxaManutencao: "0.01",
    },
    dimensionamento: { metodoCaptacao: "esfera", resistividadeSolo: "0", casoKc: "3central", kcH: "9", kcC: "10" },
  }),

  escolar_r4_completo_animais: state({
    estrutura: { tipo: "Escolar", comprimento: 50, largura: 25, altura: 8, numOcupantes: 400, taxaOcupacao: 2000, perigoEspecial: 2, tipoSuperficie: 0.0001 },
    linhas: { energia: [energiaAerea({ ambiente: 0.01, comprimento: 200 })], sinal: [] },
    fontesDano: { S1: true, S2: false, S3: true, S4: true },
    protecoes: { npSpda: "II", npDPS: "II", npDPSClasseI: "I", condicaoLinha: 5, tensaoSuportavel: 6, resistenciaBlindagem: 2 },
    economico: {
      avaliar: true, modoSimplificado: false, ca: "10000", cb: "3000000", cc: "500000", cs: "250000",
      lfCategoria: "1", loCategoria: "2", temAnimaisComerciais: true,
      custoProtecao: "80000", taxaJuros: "0.08", taxaAmortizacao: "0.05", taxaManutencao: "0.02",
    },
    dimensionamento: { metodoCaptacao: "malha", perimetroEstrutura: "150", resistividadeSolo: "300", areaEletrodo: "1250", casoKc: "tabela13", kcN: "3" },
  }),

  area_publica_r4_sem_custos: state({
    estrutura: { tipo: "Área Pública", presencaPublico: true, comprimento: 100, largura: 60, altura: 18, numOcupantes: 2000, taxaOcupacao: 1000, perigoEspecial: 10, localizacaoRelativa: 0.25 },
    atmosferico: { estado: "SP", municipio: "Pirassununga", ng: 16, ngOriginal: 16 },
    linhas: { energia: [energiaAerea({ comprimento: 0 })], sinal: [] },
    fontesDano: { S1: true, S2: true, S3: true, S4: false },
    protecoes: { npSpda: "III", npDPS: "III-IV", npDPSClasseI: "III-IV", tensaoSuportavel: 2.5, condicaoLinha: 7 },
    economico: { avaliar: true, modoSimplificado: false, ca: "", cb: "0", cc: "0", cs: "0", lfCategoria: "3", loCategoria: "3" },
  }),

  residencial_uw_fora_tabela_ng_manual: state({
    estrutura: { numOcupantes: 0, taxaOcupacao: 10000, temEstruturaAdjacente: true, distanciaAdjacente: 15, alturaAdjacente: 10 },
    atmosferico: { ng: 9.5, ngOriginal: 16, ngEditadoManualmente: true },
    linhas: { energia: [energiaAerea({ ambiente: 0.5 })], sinal: [] },
    fontesDano: { S1: true, S2: true, S3: true, S4: true },
    protecoes: { npSpda: "IV", tensaoSuportavel: 3, resistenciaBlindagem: 2, condicaoLinha: 8 },
    economico: { avaliar: true, modoSimplificado: true, lfCategoria: "0", loCategoria: "0" },
    dimensionamento: { metodoCaptacao: "esfera", perimetroEstrutura: "70", resistividadeSolo: "800", areaEletrodo: "200", descidaIsolada: true, casoKc: "manual", kcManual: "0.37" },
  }),

  sem_ng_sem_dimensoes: state({
    estrutura: { comprimento: 0, largura: 0, altura: 0 },
    atmosferico: { estado: "", municipio: "", ng: null, ngOriginal: null },
  }),
};

/* ---------- MPS scenarios (Part 4, Annex C and Annex A) ---------- */
const PONTOS_DPS = {
  limitador_estimado_5m: pontoDPS(),
  limitador_circuito_desprezivel: pontoDPS({ comprimentoCircuitoM: "0" }),
  limitador_vazio_circuito: pontoDPS({ comprimentoCircuitoM: "" }),
  limitador_critico: pontoDPS({ up: "1.0", sistemaCritico: true, deltaUCorrenteKA: "2", deltaUComprimentoM: "0.3" }),
  comutador_longo: pontoDPS({ tipoDPS: "comutador", up: "2.5", comprimentoCircuitoM: "25", categoriaProduto: "II" }),
  uw_manual_deltau_manual: pontoDPS({ uwManual: "2", deltaUModo: "manual", deltaUManual: "0.4", up: "1.2" }),
  faixa_127v_cat_iv: pontoDPS({ faixaFaseTensao: "110 a 127", categoriaProduto: "IV", up: "2.8", deltaUCorrenteKA: "10", deltaUComprimentoM: "1" }),
  faixa_480v_cat_i: pontoDPS({ faixaFaseTensao: "380 a 480", categoriaProduto: "I", up: "2" }),
  sem_up: pontoDPS({ up: "" }),
  faixa_invalida: pontoDPS({ faixaFaseTensao: "999" }),
  deltau_manual_vazio: pontoDPS({ deltaUModo: "manual", deltaUManual: "" }),
  deltau_estimado_incompleto: pontoDPS({ deltaUComprimentoM: "" }),
};

const AVALIACOES_CAMPO = [
  { np: "I", c: avaliacaoCampo() },
  { np: "II", c: avaliacaoCampo({ malhaEquipotencial: true, kh: "" }) },
  { np: "III", c: avaliacaoCampo({ materialBlindagem: "aco", rc: "0.004", freq25kHz: true, wm: "0.5" }) },
  { np: "IV", c: avaliacaoCampo({ materialBlindagem: "aco", rc: "", freq25kHz: false, wm: "12" }) },
  { np: "I", c: avaliacaoCampo({ calcularInducao: true, lacoL: "10", lacoB: "0.5", dlw: "1", dlr: "1.5" }) },
  { np: "II", c: avaliacaoCampo({ calcularInducao: true, lacoL: "8", lacoB: "2", lacoRc: "", dlw: "", dlr: "" }) },
  { np: "III", c: avaliacaoCampo({ cenario: "proximo", alturaEstrutura: "20", comprimentoEstrutura: "40" }) },
  { np: "IV", c: avaliacaoCampo({ cenario: "proximo", alturaEstrutura: "70", comprimentoEstrutura: "30" }) },
  { np: "I", c: avaliacaoCampo({ cenario: "proximo", Sa: "150", calcularInducao: true, lacoL: "6", lacoB: "1" }) },
  { np: "II", c: avaliacaoCampo({ cenario: "proximo", alturaEstrutura: "10", comprimentoEstrutura: "20", raioEsferaRolante: "25", wm: "2" }) },
  { np: "nenhum", c: avaliacaoCampo() },
  { np: "I", c: avaliacaoCampo({ wm: "0" }) },
  { np: "I", c: avaliacaoCampo({ materialBlindagem: "aco", rc: "", freq25kHz: true }) },
  { np: "I", c: avaliacaoCampo({ kh: "abc" }) },
  { np: "I", c: avaliacaoCampo({ dw: "0" }) },
  { np: "II", c: avaliacaoCampo({ cenario: "proximo", alturaEstrutura: "" }) },
];

/* ---------- Direct engine sweeps ---------- */
const NPS = ["I", "II", "III", "IV"];
const ALTURAS = [0, 1, 2, 3.1, 5, 8.11, 10, 15, 19.51, 20, 20.5, 25, 30, 30.5, 40, 44.71, 45, 50, 60, 61];
const RHOS = [0, 100, 333.33, 550, 1000, 2500, 5000];

function sweeps(api) {
  const P2 = api.NEMAX_CALC, P3 = api.NEMAX_CALC_P3, P4 = api.NEMAX_CALC_P4, CA = api.NEMAX_CALC_P4_CAMPO, R4 = api.NEMAX_CALC_R4;
  const out = {};

  out.p2 = {
    AD: [[20, 10, 6], [60, 40, 25], [1, 1, 0.5]].map((x) => P2.calc_AD(...x)),
    ADlinha: [2, 5.5].map((h) => P2.calc_ADlinha(h)),
    NDJ: P2.calc_NDJ(16, 5000, 0.5, 0.2),
    PMS: P2.calc_PMS(0.6, 0.6, 1, 0.4),
    KS1: [0, 5, 8.33, 10, 20].map((w) => P2.calc_KS1_KS2(w)),
    KS4: [0.35, 1, 1.5, 6].map((u) => P2.calc_KS4(u)),
    L3: P2.calc_L3(0.5, 0.1, 0.1, 1, 4),
    interpPLD: [0.35, 0.5, 1, 1.5, 2.5, 4, 6, 3].flatMap((u) => [0, 1, 2, 3].map((i) => P2.interp_tabela_kv(P2.tabelas.B8_PLD, u, i))),
    interpPLI: [1, 1.5, 2.5, 4, 6, 0.5].flatMap((u) => [0, 1].map((i) => P2.interp_tabela_kv(P2.tabelas.B9_PLI, u, i))),
    tabelas: P2.tabelas,
    constantes: P2.constantes,
  };

  out.p3 = {
    tabelas: P3.tabelas,
    tabela13: [0, 1, 2, 3, 8].map((n) => P3.tabela13_kc(n)),
    angulo: NPS.flatMap((np) => ALTURAS.map((h) => P3.calc_anguloProtecao(np, h))),
    anguloInvalido: [null, NaN, -1].map((h) => P3.calc_anguloProtecao("I", h)),
    eletrodo: NPS.flatMap((np) => RHOS.map((r) => P3.calc_comprimentoMinEletrodo(np, r))),
    eletrodoInvalido: [null, NaN, -5].map((r) => P3.calc_comprimentoMinEletrodo("I", r)),
    raioEq: [1, 100, 2400].map((a) => P3.calc_raioEquivalenteEletrodo(a)),
    dispensa: [[5, 3], [3, 5], [4, 4]].map((x) => P3.calc_dispensaComplementacao(...x)),
    complementar: [[5, 20], [10, 5]].map((x) => P3.calc_eletrodoComplementar(...x)),
    descidas: NPS.flatMap((np) => [10, 40, 60, 61, 200].map((p) => P3.calc_numeroMinDescidas(p, np))),
    espacamento: P3.calc_espacamentoReal(60, 4),
    kc1: P3.calc_kc_umaDescida(),
    kc2: P3.calc_kc_duasDescidas(10, 15),
    kc3: P3.calc_kc_tresDescidasCentral(10, 15),
    kcN: [[3, 10, 10], [4, 10, 10], [8, 2, 25], [20, 10, 4]].map((x) => P3.calc_kc_multiplasDescidas(...x)),
    sSimpl: NPS.flatMap((np) => ["ar", "solido"].map((m) => P3.calc_distanciaSeguranca_simplificada(np, m, 0.44, 10))),
    sCompleta: P3.calc_distanciaSeguranca_completa("II", "ar", [{ kc: 0.44, l: 10 }, { kc: 0.25, l: 4 }]),
    secaoBlindagem: P3.calc_secaoMinBlindagem(50, 1.7e-8, 200, 2.5),
    lcAterrada: P3.calc_comprimentoLinhaBlindagem_aterrada(400),
    ifCobre: P3.calc_correnteLimiteBlindagemCobre(16),
    ifNaoBlindados: P3.calc_correnteLimiteCondutoresNaoBlindados(4, 10),
    resolverKc: [
      null,
      { casoKc: "1" },
      { casoKc: "2", kcH: "10", kcC: "15" },
      { casoKc: "2", kcH: "", kcC: "15" },
      { casoKc: "3central", kcH: "10", kcC: "15" },
      { casoKc: "multiplas", kcH: "4", kcC: "10", kcN: "20" },
      { casoKc: "multiplas", kcH: "4", kcC: "10", kcN: "3" },
      { casoKc: "tabela13", kcN: "2" },
      { casoKc: "manual", kcManual: "0.33" },
      { casoKc: "manual", kcManual: "" },
      { casoKc: "simplificada" },
    ].map((d) => P3.resolverKc(d)),
  };

  out.p4 = {
    terminologia: P4.TERMINOLOGIA,
    tabelas: P4.tabelas,
    zpr: P4.listarZPR(),
    mps: P4.listarMPSBasicas(),
    tabela1: P4.tabelas.TABELA1_EQUIPOTENCIALIZACAO.map((l) => P4.tabela1_secaoMinima(l.componente, l.material)).concat([P4.tabela1_secaoMinima("x", "y")]),
    tabelaA1: P4.tabelas.TABELA_A1_UW.flatMap((l) => ["IV", "III", "II", "I"].map((cat) => P4.tabelaA1_uw(l.faixaFase, cat))).concat([P4.tabelaA1_uw("0", "I")]),
    tabelaD1: [1, 2, 5, 10, 12.5, 20, 25, 7].map((i) => P4.tabelaD1_porIimp(i)),
    upLimitador: P4.calc_UpEfetivo_limitador(1.5, 0.25),
    upComutador: [P4.calc_UpEfetivo_comutador(2.5, 0.25), P4.calc_UpEfetivo_comutador(0.2, 0.9)],
    deltaU: P4.calc_deltaU_estimado(5, 0.5),
    condicoes: [
      [1.0, 1.5, 0, false], [1.4, 1.5, 0.005, false], [1.1, 1.5, 5, false], [1.3, 1.5, 5, false],
      [0.7, 1.5, 5, true], [0.9, 1.5, 5, true], [1.0, 1.5, 25, false], [1.0, 1.5, null, false], [1.0, 1.5, undefined, true],
    ].map((x) => P4.verificarCondicaoProtecao(...x)),
    aviso2x: [[1, 2.5], [1.5, 2.5]].map((x) => P4.avisoOscilacaoCircuitoLongo(...x)),
  };

  out.campo = {
    tabela3: CA.TABELA3_PARTE1,
    np: ["I", "II", "III", "IV", "X"].map((n) => [CA.normalizarNP(n), CA.parametrosNP(n)]),
    sfCobre: [[0.5, false], [5, true], [10, false]].map((x) => CA.calc_SF_planaCobreAluminio(...x)),
    sfAco: [[0.5, 0.004, true, false], [0.5, 0.004, false, true], [12, 0.01, true, false]].map((x) => CA.calc_SF_planaAco(...x)),
    h1: NPS.flatMap((np) => ["F", "FN", "S", "X"].map((c) => CA.calc_H1_impactoDireto(np, c, 5, 3, 2))).concat([CA.calc_H1_impactoDireto("X", "F", 5, 3, 2), CA.calc_H1_impactoDireto("I", "F", 5, 3, 2, 0.02)]),
    reducao: [CA.aplicarReducaoMalhaEquipotencial(100, true), CA.aplicarReducaoMalhaEquipotencial(100, false)],
    ds: [[25, 2], [5, 2]].flatMap((x) => [CA.calc_ds1(...x), CA.calc_ds2(...x)]),
    h0: NPS.flatMap((np) => ["F", "FN", "S", "X"].map((c) => CA.calc_H0_impactoProximo(np, c, 100))).concat([CA.calc_H0_impactoProximo("X", "F", 100)]),
    h1h0: CA.calc_H1_atenuado_deH0(318.31, 24.6),
    sa: [[45, 20, 40], [20, 25, 30], [60, 60, 10]].map((x) => CA.calc_sa(...x)),
    hn: CA.calc_Hn1_deZPRn(50, 12),
    ls: [[10, 0.5, 0.005], [8, 2, 0.001]].map((x) => CA.calc_LS_laco(...x)),
    uocGeral: NPS.flatMap((np) => ["F", "FN", "S", "X"].map((c) => CA.calc_UOC_max_impactoDireto(np, c, 0.5, 10, 1, 1.5, 5))).concat([CA.calc_UOC_max_impactoDireto("X", "F", 1, 1, 1, 1, 1)]),
    uocF: CA.calc_UOC_max_F(0.5, 10, 1, 1.5, 5, 200),
    iscF: CA.calc_ISC_max_F(0.5, 10, 1, 1.5, 5, 200, 1e-5),
    uocFN: CA.calc_UOC_max_FN(0.5, 10, 1, 1.5, 5, 100),
    iscFN: CA.calc_ISC_max_FN(0.5, 10, 1, 1.5, 5, 100, 1e-5),
    uocS: CA.calc_UOC_max_S(0.5, 10, 1, 1.5, 5, 50),
    iscS: CA.calc_ISC_max_S(0.5, 10, 1, 1.5, 5, 50, 1e-5),
    homog: [
      CA.calc_UOC_max_F_homogeneo(1, 6, 12.5), CA.calc_ISC_max_F_homogeneo(1, 6, 12.5, 1e-5),
      CA.calc_UOC_max_FN_homogeneo(1, 6, 12.5), CA.calc_ISC_max_FN_homogeneo(1, 6, 12.5, 1e-5),
      CA.calc_UOC_max_S_homogeneo(1, 6, 12.5), CA.calc_ISC_max_S_homogeneo(1, 6, 12.5, 1e-5),
    ],
  };

  out.r4 = {
    tabelaD2: R4.TABELA_D2_L4,
    rt4: R4.RT4_REPRESENTATIVO,
    la4: [R4.calc_LA4_LU4(0.01, 0.01, 10, 100, false), R4.calc_LA4_LU4(0.01, 0.01, 10, 0, false), R4.calc_LA4_LU4(0.01, 0.01, 10, 100, true)],
    lb4: [R4.calc_LB4_LV4(0.5, 0.01, 0.2, 1, 2, 3, 4, 20, false), R4.calc_LB4_LV4(0.5, 0.01, 0.2, 1, 2, 3, 4, 0, false), R4.calc_LB4_LV4(0.5, 0.01, 0.2, 1, 2, 3, 4, 20, true)],
    lc4: [R4.calc_LC4_LM4_LW4_LZ4(0.01, 5, 20, false), R4.calc_LC4_LM4_LW4_LZ4(0.01, 5, 0, false), R4.calc_LC4_LM4_LW4_LZ4(0.01, 5, 20, true)],
    comp: R4.calc_R4_componente(0.01, 0.2, 0.005, "RB4", "Eq. (D.3)"),
    total: [R4.calc_R4_total({ RA4: null, RB4: { value: 1e-4 }, RC4: { value: 2e-5 }, RZ4: { value: "x" } }), R4.calc_R4_total({})],
    custos: [R4.calc_CL(1e-3, 1e6), R4.calc_CRL(1e-4, 1e6), R4.calc_CPM(10000, 0.1, 0.05, 0.01), R4.calc_SM(1000, 600, 100), R4.calc_SM(500, 600, 100)],
    justificativa: [R4.avaliarJustificativaCusto(1000, 100, 600), R4.avaliarJustificativaCusto(500, 100, 600)],
  };

  return out;
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

/* Results are compared as JSON, the format the app persists. The calculation
   timestamp is the only field that legitimately differs between runs. */
function normalize(x) {
  return JSON.parse(JSON.stringify(x === undefined ? null : x, (k, v) => (k === "calculadoEm" ? "<timestamp>" : v)));
}

function hashString(s) {
  // FNV-1a, 32 bits. Enough to detect any change in the embedded data table.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function runAll(api) {
  const results = { analises: {}, pontosDPS: {}, avaliacoesCampo: [], sweeps: null, municipios: null };

  for (const [nome, s] of Object.entries(ANALISES)) {
    const a = clone(s);
    const resultado = api.executarAnalise(a);
    const r4 = api.calcularR4(a);
    const quantitativo = api.calcularQuantitativoMateriais(a);
    results.analises[nome] = normalize({ resultado, r4, quantitativo, estadoAposCalculo: a });
  }

  for (const [nome, p] of Object.entries(PONTOS_DPS)) {
    results.pontosDPS[nome] = normalize(api.calcularPontoDPS(clone(p)));
  }

  for (const { np, c } of AVALIACOES_CAMPO) {
    const a = clone(ANALISES.hospital_np1_patrimonio);
    a.protecoes.npSpda = np;
    results.avaliacoesCampo.push(normalize(api.calcularAvaliacaoCampo(a, clone(c))));
  }

  results.sweeps = normalize(sweeps(api));

  const m = api.NEMAX_MUNICIPIOS;
  results.municipios = { total: m.length, hash: hashString(JSON.stringify(m)), primeiro: m[0], ultimo: m[m.length - 1] };

  return results;
}

export const FIXTURES = { baseState, ANALISES, PONTOS_DPS, AVALIACOES_CAMPO };
