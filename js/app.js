/* ============================================================
   APLICAÇÃO NEMAX — estado, navegação, persistência
   ============================================================ */
/* ============================================================
   APLICAÇÃO NEMAX — Sistema de Análise de Risco PDA
   ABNT NBR 5419-2:2026
   ============================================================ */

const STORAGE_KEY = "nemax_analises_v1";
const CONFIG_KEY = "nemax_config_v1";

function uid() {
  return "an_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function nowISO() {
  return new Date().toISOString();
}

function fmtData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtNum(n, digits) {
  digits = digits === undefined ? 2 : digits;
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (n === 0) return "0";
  return n.toExponential(digits).replace("e", " × 10");
}

function fmtRazao(n) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toFixed(2) + "×";
}

/* ============== PERSISTÊNCIA ============== */

function getConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    empresa: "NEMAX Engenharia",
    responsavelTecnico: "Giuseppe Maset Neto",
    crea: "CREA-PR 138473/D — visto SP",
    art: "",
    email: "contato@nemaxengenharia.com.br",
    telefone: "(19) 99651-3143",
    endereco: "Ribeirão Preto - SP / São José do Rio Preto — SP / Pirasununga - SP",
  };
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function getAnalises() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveAnalises(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function salvarAnalise(analise) {
  const list = getAnalises();
  const idx = list.findIndex((a) => a.id === analise.id);
  analise.atualizadoEm = nowISO();
  if (!analise.auditoria) analise.auditoria = [];
  analise.auditoria.push({ data: nowISO(), acao: idx === -1 ? "Criada" : "Atualizada", versao: analise.auditoria.length + 1 });
  if (idx === -1) {
    list.push(analise);
  } else {
    list[idx] = analise;
  }
  saveAnalises(list);
}

function excluirAnalise(id) {
  const list = getAnalises().filter((a) => a.id !== id);
  saveAnalises(list);
}

function duplicarAnalise(id) {
  const list = getAnalises();
  const original = list.find((a) => a.id === id);
  if (!original) return null;
  const copia = JSON.parse(JSON.stringify(original));
  copia.id = uid();
  copia.criadoEm = nowISO();
  copia.atualizadoEm = nowISO();
  copia.auditoria = [{ data: nowISO(), acao: "Duplicada a partir de " + id, versao: 1 }];
  if (copia.identificacao) copia.identificacao.numeroLaudo = "";
  list.push(copia);
  saveAnalises(list);
  return copia;
}

/* ============== ESTADO DA APLICAÇÃO ============== */

function novoEstadoAnalise() {
  return {
    id: uid(),
    criadoEm: nowISO(),
    atualizadoEm: nowISO(),
    auditoria: [],
    identificacao: {
      cliente: "", responsavel: "", empresa: "", telefone: "", email: "",
      endereco: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "",
      latitude: "", longitude: "", dataAnalise: new Date().toISOString().slice(0, 10),
      numeroLaudo: "", numeroART: "", observacoes: "",
    },
    estrutura: {
      tipo: "Residencial",
      comprimento: "", largura: "", altura: "",
      areaConstruida: "", areaTotal: "", numPavimentos: "",
      numOcupantes: "", taxaOcupacao: 8760,
      temEstruturaAdjacente: false, distanciaAdjacente: "", alturaAdjacente: "",
      areasExternasOcupadas: false, presencaPublico: false, presencaAnimais: false,
      materiaisInflamaveis: false, materiaisExplosivos: false, substanciasPerigosas: false,
      impactoAmbiental: false, patrimonioCultural: false, servicoEssencial: false,
      localizacaoRelativa: 1, // CD
      tipoConstrucao: 2, // rs — simples (madeira/alvenaria) por padrão
      tipoSuperficie: 0.01, // rt — terra/concreto
      providenciasIncendio: 1, // rp — nenhuma
      riscoIncendio: 0.01, // rf — normal
      perigoEspecial: 1, // hz — sem perigo especial
    },
    atmosferico: { estado: "", municipio: "", ng: null, ngOriginal: null, ngEditadoManualmente: false },
    linhas: { energia: [], sinal: [] },
    fontesDano: { S1: true, S2: true, S3: false, S4: false },
    protecoes: {
      npSpda: "nenhum", // nenhum | IV | III | II | I
      medidaToquePasso: 1, // PTA
      npDPS: "nenhum", // PSPD
      medidaToqueLinha: 1, // PTU
      npDPSClasseI: "nenhum", // PEB
      condicaoLinha: 0, // índice da tabela B4
      tensaoSuportavel: 1.5, // UW kV
      resistenciaBlindagem: 0, // índice tabela B8 (0 = não blindada / blindagem não interligada ao BEP)
      wm: 10, // largura de malha para KS1/KS2
      ks3Tipo: 1, // fiação interna
    },
    resultado: null,
    dimensionamento: novoEstadoDimensionamento(),
    mps: novoEstadoMPS(),
    economico: novoEstadoEconomico(),
  };
}

function novoEstadoEconomico() {
  return {
    avaliar: false, // R4 é opcional/informativo (D.1.1) — desligado por padrão
    modoSimplificado: true, // true = relações ca/ct etc. = 1 (D.1, nota da Tabela D.1); false = valores monetários reais por zona
    ca: "", cb: "", cc: "", cs: "", // valores em R$: animais, edificação, conteúdo, sistemas internos (modo completo)
    ctSimplificado: "", // valor total único em R$, usado apenas para Eq. D.7-D.12 (custo-benefício) no modo simplificado — não afeta R4 em si, já que as relações já são 1 nesse modo
    lfCategoria: "", // índice em NEMAX_CALC_R4.TABELA_D2_L4.LF
    loCategoria: "", // índice em NEMAX_CALC_R4.TABELA_D2_L4.LO
    temAnimaisComerciais: false, // habilita RA4/RU4 (D.1.4, nota de rodapé)
    // Custo-benefício (D.2)
    custoProtecao: "", // CP
    taxaJuros: "", // i
    taxaAmortizacao: "", // a
    taxaManutencao: "", // m
  };
}

/* ============== APP — ROTEAMENTO ============== */

const App = (function () {
  let currentAnalise = null;
  let currentRoute = "dashboard";
  let currentModulo = 0;

  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2400);
  }

  function setActiveNav(id) {
    document.querySelectorAll(".topbar-nav button").forEach((b) => b.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
  }

  function goDashboard() {
    currentRoute = "dashboard";
    setActiveNav("nav-dashboard");
    render();
  }

  function novaAnalise() {
    currentAnalise = novoEstadoAnalise();
    currentRoute = "wizard";
    currentModulo = 0;
    setActiveNav("nav-nova");
    render();
  }

  function abrirAnalise(id) {
    const list = getAnalises();
    const a = list.find((x) => x.id === id);
    if (!a) return showToast("Análise não encontrada.");
    currentAnalise = a;
    currentRoute = "wizard";
    currentModulo = 0;
    render();
  }

  function goHistorico() {
    currentRoute = "historico";
    setActiveNav("nav-historico");
    render();
  }

  function goConfig() {
    currentRoute = "config";
    setActiveNav("nav-config");
    render();
  }

  function irParaModulo(idx) {
    currentModulo = idx;
    render();
  }

  function render() {
    const wrap = document.getElementById("app-wrap");
    if (currentRoute === "dashboard") {
      wrap.innerHTML = Views.dashboard();
    } else if (currentRoute === "historico") {
      wrap.innerHTML = Views.historico();
    } else if (currentRoute === "config") {
      wrap.innerHTML = Views.config();
    } else if (currentRoute === "wizard") {
      wrap.innerHTML = Views.wizard(currentAnalise, currentModulo);
      Wizard.bindModulo(currentAnalise, currentModulo);
    }
  }

  return {
    showToast, goDashboard, novaAnalise, abrirAnalise, goHistorico, goConfig, irParaModulo, render,
    getCurrentAnalise: () => currentAnalise,
    setCurrentAnalise: (a) => { currentAnalise = a; },
    getCurrentModulo: () => currentModulo,
  };
})();


/* ============================================================
   VIEWS — Dashboard, Histórico, Configurações
   ============================================================ */

const Views = (function () {
  function dashboard() {
    const list = getAnalises();
    const total = list.length;
    const aprovadas = list.filter((a) => a.resultado && a.resultado.conforme).length;
    const reprovadas = list.filter((a) => a.resultado && !a.resultado.conforme).length;
    const pendentes = total - aprovadas - reprovadas;

    const recentes = [...list].sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm)).slice(0, 6);

    return `
      <div class="dash-header">
        <div class="dash-title">Dashboard</div>
        <div class="dash-sub">Sistema de análise de risco PDA conforme ABNT NBR 5419-2:2026</div>
      </div>

      <div class="dash-grid">
        <div class="dash-card" onclick="App.novaAnalise()">
          <div class="dash-card-icon">＋</div>
          <div class="dash-card-title">Nova análise</div>
          <div class="dash-card-desc">Iniciar análise de risco completa de uma edificação</div>
        </div>
        <div class="dash-card" onclick="App.goHistorico()">
          <div class="dash-card-icon">≡</div>
          <div class="dash-card-title">Histórico</div>
          <div class="dash-card-desc">Consultar, editar e exportar análises salvas</div>
        </div>
        <div class="dash-card" onclick="App.goHistorico()">
          <div class="dash-card-icon">▤</div>
          <div class="dash-card-title">Relatórios</div>
          <div class="dash-card-desc">Gerar laudos técnicos em PDF com ART</div>
        </div>
        <div class="dash-card" onclick="App.goConfig()">
          <div class="dash-card-icon">⚙</div>
          <div class="dash-card-title">Configurações</div>
          <div class="dash-card-desc">Dados da empresa, CREA e responsável técnico</div>
        </div>
      </div>

      <div class="dash-stats">
        <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">Análises realizadas</div></div>
        <div class="stat-box"><div class="stat-num" style="color:var(--ok)">${aprovadas}</div><div class="stat-label">Dentro do risco tolerável</div></div>
        <div class="stat-box"><div class="stat-num" style="color:var(--fail)">${reprovadas}</div><div class="stat-label">Acima do risco tolerável</div></div>
        <div class="stat-box"><div class="stat-num">${pendentes}</div><div class="stat-label">Em andamento</div></div>
      </div>

      <div class="section-title">Análises recentes</div>
      ${recentes.length === 0 ? `<div class="hist-table"><div class="hist-empty">Nenhuma análise realizada ainda. Clique em "Nova análise" para começar.</div></div>` : `
      <table class="hist-table">
        <thead><tr><th>Cliente</th><th>Endereço</th><th>Tipo</th><th>Resultado</th><th>Atualizado</th><th></th></tr></thead>
        <tbody>
          ${recentes.map(rowHist).join("")}
        </tbody>
      </table>`}
    `;
  }

  function rowHist(a) {
    const id = a.identificacao || {};
    const est = a.estrutura || {};
    let pill = `<span class="pill pending">Em andamento</span>`;
    if (a.resultado) {
      pill = a.resultado.conforme
        ? `<span class="pill ok">Dentro do limite</span>`
        : `<span class="pill fail">Acima do limite</span>`;
    }
    return `
      <tr style="cursor:pointer" onclick="App.abrirAnalise('${a.id}')">
        <td><b>${esc(id.cliente) || "(sem nome)"}</b></td>
        <td>${esc(id.cidade)}${id.estado ? "/" + esc(id.estado) : ""}</td>
        <td>${esc(est.tipo)}</td>
        <td>${pill}</td>
        <td>${fmtData(a.atualizadoEm)}</td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="icon-btn" onclick="HistAction.duplicar('${a.id}')">Duplicar</button>
            <button class="icon-btn danger" onclick="HistAction.excluir('${a.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }

  function historico() {
    const list = [...getAnalises()].sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
    return `
      <div class="dash-header">
        <div class="dash-title">Histórico de análises</div>
        <div class="dash-sub">${list.length} análise(s) registrada(s) neste dispositivo</div>
      </div>
      <div style="display:flex; gap:10px; margin-bottom:18px;">
        <button class="btn btn-primary" onclick="App.novaAnalise()">＋ Nova análise</button>
        <button class="btn btn-secondary" onclick="HistAction.exportarTudo()">Exportar tudo (JSON)</button>
        <label class="btn btn-secondary" style="display:inline-flex; align-items:center;">
          Importar JSON
          <input type="file" accept="application/json" style="display:none" onchange="HistAction.importar(event)">
        </label>
      </div>
      ${list.length === 0 ? `<div class="hist-table"><div class="hist-empty">Nenhuma análise salva ainda.</div></div>` : `
      <table class="hist-table">
        <thead><tr><th>Cliente</th><th>Endereço</th><th>Tipo</th><th>Laudo nº</th><th>Resultado</th><th>Atualizado</th><th></th></tr></thead>
        <tbody>
          ${list.map((a) => {
            const id = a.identificacao || {};
            const est = a.estrutura || {};
            let pill = `<span class="pill pending">Em andamento</span>`;
            if (a.resultado) {
              pill = a.resultado.conforme ? `<span class="pill ok">Dentro do limite</span>` : `<span class="pill fail">Acima do limite</span>`;
            }
            return `<tr style="cursor:pointer" onclick="App.abrirAnalise('${a.id}')">
              <td><b>${esc(id.cliente) || "(sem nome)"}</b></td>
              <td>${esc(id.cidade)}${id.estado ? "/" + esc(id.estado) : ""}</td>
              <td>${esc(est.tipo)}</td>
              <td>${esc(id.numeroLaudo) || "—"}</td>
              <td>${pill}</td>
              <td>${fmtData(a.atualizadoEm)}</td>
              <td onclick="event.stopPropagation()">
                <div class="row-actions">
                  <button class="icon-btn" onclick="HistAction.duplicar('${a.id}')">Duplicar</button>
                  <button class="icon-btn" onclick="HistAction.exportarUm('${a.id}')">Exportar</button>
                  <button class="icon-btn danger" onclick="HistAction.excluir('${a.id}')">Excluir</button>
                </div>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
    `;
  }

  function config() {
    const cfg = getConfig();
    return `
      <div class="dash-header">
        <div class="dash-title">Configurações</div>
        <div class="dash-sub">Dados institucionais usados na capa e rodapé dos relatórios</div>
      </div>
      <div class="wizard-panel" style="max-width:640px;">
        <div class="wpanel-body">
          <div class="field-grid cols-1">
            <div class="field"><label>Nome da empresa</label><input type="text" id="cfg-empresa" value="${esc(cfg.empresa)}"></div>
            <div class="field"><label>Responsável técnico</label><input type="text" id="cfg-resp" value="${esc(cfg.responsavelTecnico)}"></div>
            <div class="field"><label>Registro CREA</label><input type="text" id="cfg-crea" value="${esc(cfg.crea)}"></div>
            <div class="field"><label>E-mail</label><input type="email" id="cfg-email" value="${esc(cfg.email)}"></div>
            <div class="field"><label>Telefone / WhatsApp</label><input type="text" id="cfg-tel" value="${esc(cfg.telefone)}"></div>
            <div class="field"><label>Endereço / região de atuação</label><input type="text" id="cfg-end" value="${esc(cfg.endereco)}"></div>
          </div>
        </div>
        <div class="wpanel-footer">
          <span></span>
          <button class="btn btn-primary" onclick="ConfigAction.salvar()">Salvar configurações</button>
        </div>
      </div>
    `;
  }

  return { dashboard, historico, config };
})();

const HistAction = {
  duplicar(id) {
    const c = duplicarAnalise(id);
    if (c) { App.showToast("Análise duplicada."); App.render(); }
  },
  excluir(id) {
    if (!confirm("Excluir esta análise permanentemente?")) return;
    excluirAnalise(id);
    App.showToast("Análise excluída.");
    App.render();
  },
  exportarUm(id) {
    const a = getAnalises().find((x) => x.id === id);
    if (!a) return;
    downloadJSON(a, `nemax-analise-${id}.json`);
  },
  exportarTudo() {
    downloadJSON(getAnalises(), `nemax-analises-${new Date().toISOString().slice(0,10)}.json`);
  },
  importar(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        const list = getAnalises();
        const importadas = Array.isArray(data) ? data : [data];
        importadas.forEach((a) => {
          if (!a.id) a.id = uid();
          const idx = list.findIndex((x) => x.id === a.id);
          if (idx === -1) list.push(a); else list[idx] = a;
        });
        saveAnalises(list);
        App.showToast(`${importadas.length} análise(s) importada(s).`);
        App.render();
      } catch (err) {
        App.showToast("Erro ao importar arquivo JSON.");
      }
    };
    reader.readAsText(file);
  },
};

const ConfigAction = {
  salvar() {
    const cfg = {
      empresa: document.getElementById("cfg-empresa").value,
      responsavelTecnico: document.getElementById("cfg-resp").value,
      crea: document.getElementById("cfg-crea").value,
      email: document.getElementById("cfg-email").value,
      telefone: document.getElementById("cfg-tel").value,
      endereco: document.getElementById("cfg-end").value,
    };
    saveConfig(cfg);
    document.getElementById("empresa-nome-topo").textContent = cfg.empresa;
    App.showToast("Configurações salvas.");
  },
};

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function esc(s) {
  if (s === undefined || s === null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}


/* ============================================================
   WIZARD — Módulos 1 a 15 da análise de risco
   ============================================================ */

const MODULOS = [
  { id: "identificacao", num: 1, label: "Identificação da edificação" },
  { id: "estrutura", num: 2, label: "Caracterização da estrutura" },
  { id: "atmosferico", num: 3, label: "Dados atmosféricos" },
  { id: "linhas", num: 4, label: "Linhas conectadas" },
  { id: "fontes", num: 5, label: "Fontes de dano (S1–S4)" },
  { id: "protecoes", num: 6, label: "Medidas de proteção" },
  { id: "resultados", num: 7, label: "Resultados e componentes de risco" },
  { id: "dimensionamento", num: 8, label: "Dimensionamento físico do SPDA (NBR 5419-3)" },
  { id: "mps", num: 9, label: "Medidas de Proteção contra Surtos — MPS (NBR 5419-4)" },
  { id: "memoria", num: 10, label: "Memória de cálculo" },
  { id: "relatorio", num: 11, label: "Relatório (PDF)" },
];

const Views_old_wizard = {}; // namespace guard

Views.wizard = function (analise, moduloIdx) {
  const id = analise.identificacao;
  const navItems = MODULOS.map((m, i) => {
    const cls = i === moduloIdx ? "active" : (moduloCompleto(analise, i) ? "done" : "");
    return `<div class="wnav-item ${cls}" onclick="App.irParaModulo(${i})">
      <span class="wnav-num">${i === moduloIdx ? m.num : (moduloCompleto(analise, i) ? "✓" : m.num)}</span>
      <span>${m.label}</span>
    </div>`;
  }).join("");

  return `
    <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:18px; font-weight:700; color:var(--navy);">${esc(id.cliente) || "Nova análise"}</div>
        <div style="font-size:12.5px; color:var(--gray-text);">${esc(id.cidade)}${id.estado ? "/" + esc(id.estado) : ""} · ${esc(analise.estrutura.tipo)}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary" onclick="Wizard.salvarESair()">Salvar e sair</button>
        <button class="btn btn-primary" onclick="Wizard.salvarAtual(); App.showToast('Salvo.');">Salvar</button>
      </div>
    </div>
    <div class="wizard-shell">
      <div class="wizard-nav">${navItems}</div>
      <div class="wizard-panel">${Wizard.renderModulo(analise, moduloIdx)}</div>
    </div>
  `;
};

function moduloCompleto(analise, idx) {
  const id = MODULOS[idx].id;
  if (id === "identificacao") return !!analise.identificacao.cliente;
  if (id === "estrutura") return !!analise.estrutura.comprimento;
  if (id === "atmosferico") return !!analise.atmosferico.ng;
  if (id === "resultados") return !!analise.resultado;
  if (id === "dimensionamento") return !!(analise.dimensionamento && analise.dimensionamento.perimetroEstrutura && analise.dimensionamento.resistividadeSolo);
  if (id === "mps") return !!(analise.mps && analise.mps.pontosDPS && analise.mps.pontosDPS.length > 0);
  return false;
}

const Wizard = (function () {
  function renderModulo(analise, idx) {
    const m = MODULOS[idx];
    const body = {
      identificacao: M_Identificacao.render,
      estrutura: M_Estrutura.render,
      atmosferico: M_Atmosferico.render,
      linhas: M_Linhas.render,
      fontes: M_Fontes.render,
      protecoes: M_Protecoes.render,
      resultados: M_Resultados.render,
      dimensionamento: M_DimensionamentoSPDA.render,
      mps: M_MPS.render,
      memoria: M_Memoria.render,
      relatorio: M_Relatorio.render,
    }[m.id](analise);

    const isFirst = idx === 0;
    const isLast = idx === MODULOS.length - 1;

    return `
      <div class="wpanel-header">
        <div class="wpanel-kicker">Módulo ${m.num} de ${MODULOS.length}</div>
        <div class="wpanel-title">${m.label}</div>
      </div>
      <div class="wpanel-body">${body}</div>
      <div class="wpanel-footer">
        <button class="btn btn-secondary" ${isFirst ? "disabled" : ""} onclick="Wizard.salvarAtual(); App.irParaModulo(${idx - 1})">← Anterior</button>
        <button class="btn btn-primary" onclick="Wizard.avancar(${idx})">${isLast ? "Concluir" : "Próximo →"}</button>
      </div>
    `;
  }

  function bindModulo(analise, idx) {
    const m = MODULOS[idx];
    const bindFn = {
      identificacao: M_Identificacao.bind,
      estrutura: M_Estrutura.bind,
      atmosferico: M_Atmosferico.bind,
      linhas: M_Linhas.bind,
      fontes: M_Fontes.bind,
      protecoes: M_Protecoes.bind,
      resultados: M_Resultados.bind,
      dimensionamento: M_DimensionamentoSPDA.bind,
      mps: M_MPS.bind,
      memoria: M_Memoria.bind,
      relatorio: M_Relatorio.bind,
    }[m.id];
    if (bindFn) bindFn(analise);
  }

  function salvarAtual() {
    const analise = App.getCurrentAnalise();
    const idx = App.getCurrentModulo();
    const m = MODULOS[idx];
    const coletarFn = {
      identificacao: M_Identificacao.coletar,
      estrutura: M_Estrutura.coletar,
      atmosferico: M_Atmosferico.coletar,
      linhas: M_Linhas.coletar,
      fontes: M_Fontes.coletar,
      protecoes: M_Protecoes.coletar,
      resultados: () => {},
      dimensionamento: M_DimensionamentoSPDA.coletar,
      mps: M_MPS.coletar,
      memoria: () => {},
      relatorio: () => {},
    }[m.id];
    if (coletarFn) coletarFn(analise);
    salvarAnalise(analise);
  }

  function avancar(idx) {
    salvarAtual();
    if (idx === MODULOS.length - 1) {
      App.showToast("Análise concluída e salva.");
      App.goHistorico();
      return;
    }
    if (MODULOS[idx + 1].id === "resultados" || MODULOS[idx].id === "protecoes") {
      Calculo.executar(App.getCurrentAnalise());
      salvarAnalise(App.getCurrentAnalise());
    }
    App.irParaModulo(idx + 1);
  }

  function salvarESair() {
    salvarAtual();
    App.showToast("Análise salva.");
    App.goHistorico();
  }

  return { renderModulo, bindModulo, salvarAtual, avancar, salvarESair };
})();


/* ============================================================
   MÓDULO 1 — IDENTIFICAÇÃO DA EDIFICAÇÃO
   ============================================================ */

const M_Identificacao = (function () {
  function render(a) {
    const d = a.identificacao;
    return `
      <div class="subsection">
        <div class="subsection-title">Cliente e contrato</div>
        <div class="field-grid">
          <div class="field"><label>Cliente</label><input type="text" id="f-cliente" value="${esc(d.cliente)}" placeholder="Nome ou razão social"></div>
          <div class="field"><label>Responsável pelo imóvel</label><input type="text" id="f-responsavel" value="${esc(d.responsavel)}"></div>
          <div class="field"><label>Empresa contratante (se diferente)</label><input type="text" id="f-empresa" value="${esc(d.empresa)}"></div>
          <div class="field"><label>Telefone</label><input type="tel" id="f-telefone" value="${esc(d.telefone)}"></div>
          <div class="field"><label>E-mail</label><input type="email" id="f-email" value="${esc(d.email)}"></div>
          <div class="field"><label>Data da análise</label><input type="date" id="f-dataAnalise" value="${esc(d.dataAnalise)}"></div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Endereço da edificação</div>
        <div class="field-grid cols-3">
          <div class="field span-2"><label>Endereço</label><input type="text" id="f-endereco" value="${esc(d.endereco)}"></div>
          <div class="field"><label>Número</label><input type="text" id="f-numero" value="${esc(d.numero)}"></div>
          <div class="field"><label>Complemento</label><input type="text" id="f-complemento" value="${esc(d.complemento)}"></div>
          <div class="field"><label>Bairro</label><input type="text" id="f-bairro" value="${esc(d.bairro)}"></div>
          <div class="field"><label>CEP</label><input type="text" id="f-cep" value="${esc(d.cep)}"></div>
          <div class="field"><label>Cidade</label><input type="text" id="f-cidade" value="${esc(d.cidade)}"></div>
          <div class="field"><label>Estado (UF)</label><input type="text" id="f-estado" maxlength="2" style="text-transform:uppercase" value="${esc(d.estado)}"></div>
          <div class="field"><label>Latitude</label><input type="text" id="f-latitude" value="${esc(d.latitude)}" placeholder="-20.7702"></div>
          <div class="field"><label>Longitude</label><input type="text" id="f-longitude" value="${esc(d.longitude)}" placeholder="-49.7115"></div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Documentação técnica</div>
        <div class="field-grid cols-3">
          <div class="field"><label>Número do laudo</label><input type="text" id="f-numeroLaudo" value="${esc(d.numeroLaudo)}"></div>
          <div class="field"><label>Número da ART</label><input type="text" id="f-numeroART" value="${esc(d.numeroART)}"></div>
        </div>
        <div class="field" style="margin-top:14px;">
          <label>Observações</label>
          <textarea id="f-observacoes">${esc(d.observacoes)}</textarea>
        </div>
      </div>
    `;
  }

  function bind() {}

  function coletar(a) {
    const g = (id) => document.getElementById(id).value;
    a.identificacao = {
      cliente: g("f-cliente"), responsavel: g("f-responsavel"), empresa: g("f-empresa"),
      telefone: g("f-telefone"), email: g("f-email"), endereco: g("f-endereco"),
      numero: g("f-numero"), complemento: g("f-complemento"), bairro: g("f-bairro"),
      cidade: g("f-cidade"), estado: g("f-estado").toUpperCase(), cep: g("f-cep"),
      latitude: g("f-latitude"), longitude: g("f-longitude"), dataAnalise: g("f-dataAnalise"),
      numeroLaudo: g("f-numeroLaudo"), numeroART: g("f-numeroART"), observacoes: g("f-observacoes"),
    };
  }

  return { render, bind, coletar };
})();


/* ============================================================
   MÓDULO 2 — CARACTERIZAÇÃO DA ESTRUTURA
   ============================================================ */

const TIPOS_ESTRUTURA = [
  "Residencial", "Comercial", "Industrial", "Hospitalar", "Escolar",
  "Patrimônio Cultural", "Data Center", "Agrícola", "Armazenamento", "Área Pública", "Outros",
];

const M_Estrutura = (function () {
  function render(a) {
    const e = a.estrutura;
    const opt = (arr, sel) => arr.map((o) => `<option value="${o.value}" ${Number(sel) === o.value ? "selected" : ""}>${o.label}</option>`).join("");

    return `
      <div class="subsection">
        <div class="subsection-title">Tipo e geometria</div>
        <div class="field-grid cols-3">
          <div class="field"><label>Tipo de estrutura</label>
            <select id="f-tipo">${TIPOS_ESTRUTURA.map((t) => `<option ${e.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Número de pavimentos</label><input type="number" id="f-numPavimentos" value="${esc(e.numPavimentos)}"></div>
          <div class="field"><label>Número de ocupantes</label><input type="number" id="f-numOcupantes" value="${esc(e.numOcupantes)}"></div>
        </div>
        <div class="field-grid cols-3" style="margin-top:14px;">
          <div class="field"><label>Comprimento L (m)</label><input type="number" step="0.1" id="f-comprimento" value="${esc(e.comprimento)}"></div>
          <div class="field"><label>Largura W (m)</label><input type="number" step="0.1" id="f-largura" value="${esc(e.largura)}"></div>
          <div class="field"><label>Altura H (m)</label><input type="number" step="0.1" id="f-altura" value="${esc(e.altura)}"></div>
        </div>
        <div class="field-grid cols-3" style="margin-top:14px;">
          <div class="field"><label>Área construída (m²)</label><input type="number" id="f-areaConstruida" value="${esc(e.areaConstruida)}"></div>
          <div class="field"><label>Área total do terreno (m²)</label><input type="number" id="f-areaTotal" value="${esc(e.areaTotal)}"></div>
          <div class="field"><label>Permanência anual (h/ano)</label><input type="number" id="f-taxaOcupacao" value="${esc(e.taxaOcupacao)}"><span class="hint">Máx. 8 760 h/ano</span></div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Localização relativa e tipo de construção (Anexo A / Tabela C.7)</div>
        <div class="field-grid">
          <div class="field"><label>Localização relativa (fator C_D — Tabela A.1)</label>
            <select id="f-localizacaoRelativa">${opt(NEMAX_CALC.tabelas.A1_CD, e.localizacaoRelativa)}</select>
          </div>
          <div class="field"><label>Tipo de construção (fator r_s — Tabela C.7)</label>
            <select id="f-tipoConstrucao">${opt(NEMAX_CALC.tabelas.C7_RS, e.tipoConstrucao)}</select>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Estrutura adjacente (descarga em estrutura conectada, Anexo A.2.5)</div>
        <div class="checkbox-row"><input type="checkbox" id="f-temEstruturaAdjacente" ${e.temEstruturaAdjacente ? "checked" : ""}><label for="f-temEstruturaAdjacente">Há estrutura adjacente conectada por linha elétrica</label></div>
        <div class="field-grid">
          <div class="field"><label>Distância da estrutura adjacente (m)</label><input type="number" id="f-distanciaAdjacente" value="${esc(e.distanciaAdjacente)}"></div>
          <div class="field"><label>Altura da estrutura adjacente (m)</label><input type="number" id="f-alturaAdjacente" value="${esc(e.alturaAdjacente)}"></div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Condições de risco para perda L1 (Tabelas C.3, C.4, C.5, C.6)</div>
        <div class="field-grid">
          <div class="field"><label>Tipo de superfície do solo/piso (r_t — Tabela C.3)</label>
            <select id="f-tipoSuperficie">${opt(NEMAX_CALC.tabelas.C3_RT, e.tipoSuperficie)}</select>
          </div>
          <div class="field"><label>Providências contra incêndio (r_p — Tabela C.4)</label>
            <select id="f-providenciasIncendio">${opt(NEMAX_CALC.tabelas.C4_RP, e.providenciasIncendio)}</select>
          </div>
          <div class="field"><label>Risco de incêndio/explosão (r_f — Tabela C.5)</label>
            <select id="f-riscoIncendio">${opt(NEMAX_CALC.tabelas.C5_RF, e.riscoIncendio)}</select>
          </div>
          <div class="field"><label>Perigo especial / pânico (h_z — Tabela C.6)</label>
            <select id="f-perigoEspecial">${opt(NEMAX_CALC.tabelas.C6_HZ, e.perigoEspecial)}</select>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Características que ampliam o risco</div>
        <div class="field-grid">
          ${checkbox("areasExternasOcupadas", "Áreas externas ocupadas", e.areasExternasOcupadas)}
          ${checkbox("presencaPublico", "Presença de público", e.presencaPublico)}
          ${checkbox("presencaAnimais", "Presença de animais", e.presencaAnimais)}
          ${checkbox("materiaisInflamaveis", "Materiais inflamáveis", e.materiaisInflamaveis)}
          ${checkbox("materiaisExplosivos", "Materiais ou atmosfera explosiva", e.materiaisExplosivos)}
          ${checkbox("substanciasPerigosas", "Substâncias perigosas", e.substanciasPerigosas)}
          ${checkbox("impactoAmbiental", "Impacto ambiental potencial", e.impactoAmbiental)}
          ${checkbox("patrimonioCultural", "Patrimônio cultural (avalia R3)", e.patrimonioCultural)}
          ${checkbox("servicoEssencial", "Serviço essencial / sistema crítico", e.servicoEssencial)}
        </div>
      </div>

      ${renderPainelConsistenciaEstrutura(a)}
    `;
  }

  function checkbox(id, label, val) {
    return `<div class="checkbox-row"><input type="checkbox" id="f-${id}" ${val ? "checked" : ""}><label for="f-${id}">${label}</label></div>`;
  }

  function bind(a) {
    // Mesmo padrão usado em M_DimensionamentoSPDA.bind() e M_Protecoes.bind():
    // re-renderiza ao alterar um campo que afeta o painel de consistência
    // exibido ao final do módulo (renderPainelConsistenciaEstrutura), evitando
    // que o painel fique desatualizado até o usuário avançar de módulo.
    const idsRerender = ["f-providenciasIncendio", "f-riscoIncendio"];
    idsRerender.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    });
    const elExplosivos = document.getElementById("f-materiaisExplosivos");
    if (elExplosivos) {
      elExplosivos.addEventListener("change", () => {
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    }
  }

  function coletar(a) {
    const g = (id) => document.getElementById(id).value;
    const gc = (id) => document.getElementById(id).checked;
    const gn = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? 0 : v; };
    a.estrutura = {
      tipo: g("f-tipo"),
      comprimento: gn("f-comprimento"), largura: gn("f-largura"), altura: gn("f-altura"),
      areaConstruida: gn("f-areaConstruida"), areaTotal: gn("f-areaTotal"),
      numPavimentos: gn("f-numPavimentos"), numOcupantes: gn("f-numOcupantes"),
      taxaOcupacao: gn("f-taxaOcupacao") || 8760,
      temEstruturaAdjacente: gc("f-temEstruturaAdjacente"),
      distanciaAdjacente: gn("f-distanciaAdjacente"), alturaAdjacente: gn("f-alturaAdjacente"),
      areasExternasOcupadas: gc("f-areasExternasOcupadas"), presencaPublico: gc("f-presencaPublico"),
      presencaAnimais: gc("f-presencaAnimais"), materiaisInflamaveis: gc("f-materiaisInflamaveis"),
      materiaisExplosivos: gc("f-materiaisExplosivos"), substanciasPerigosas: gc("f-substanciasPerigosas"),
      impactoAmbiental: gc("f-impactoAmbiental"), patrimonioCultural: gc("f-patrimonioCultural"),
      servicoEssencial: gc("f-servicoEssencial"),
      localizacaoRelativa: parseFloat(g("f-localizacaoRelativa")),
      tipoConstrucao: parseFloat(g("f-tipoConstrucao")),
      tipoSuperficie: parseFloat(g("f-tipoSuperficie")),
      providenciasIncendio: parseFloat(g("f-providenciasIncendio")),
      riscoIncendio: parseFloat(g("f-riscoIncendio")),
      perigoEspecial: parseFloat(g("f-perigoEspecial")),
    };
  }

  return { render, bind, coletar };
})();


/* ============================================================
   MÓDULO 3 — DADOS ATMOSFÉRICOS (N_G por município, Anexo F)
   ============================================================ */

const M_Atmosferico = (function () {
  function render(a) {
    const at = a.atmosferico;
    return `
      <div class="subsection">
        <div class="subsection-title">Localização — densidade de descargas atmosféricas N_G</div>
        <p style="font-size:13px; color:var(--gray-text); margin-bottom:16px; line-height:1.6;">
          Busque o município da edificação. O valor de N_G é carregado automaticamente da
          Tabela F.1 (Anexo F, normativo) da ABNT NBR 5419-2:2026 — banco de dados completo
          com ${NEMAX_MUNICIPIOS.length} municípios brasileiros. A norma exige (A.1.3) que somente
          esses valores sejam utilizados nos cálculos.
        </p>
        <div class="field" style="max-width:420px; position:relative;">
          <label>Buscar município</label>
          <input type="text" id="f-buscaMunicipio" placeholder="Digite o nome do município..." autocomplete="off"
            value="${at.municipio ? esc(at.municipio) + " / " + esc(at.estado) : ""}">
          <div id="lista-municipios" style="position:absolute; top:62px; left:0; right:0; background:var(--elevated); border:1px solid var(--line); border-radius:6px; max-height:240px; overflow-y:auto; z-index:50; box-shadow:0 4px 14px rgba(0,0,0,0.4); display:none;"></div>
        </div>

        <div id="ng-resultado" style="margin-top:20px;">
          ${at.ng !== null ? ngCard(at) : ""}
        </div>
      </div>

      ${at.ng !== null ? `
      <div class="subsection">
        <div class="subsection-title">Ajuste manual (opcional)</div>
        <div class="field" style="max-width:240px;">
          <label>N_G (raios/km²/ano)</label>
          <input type="number" id="f-ngManual" value="${at.ng}" onchange="M_Atmosferico.alterarManual(this.value)">
          <span class="hint">Editar aqui registra o valor como sobrescrito manualmente — o valor original da norma fica preservado para auditoria.</span>
        </div>
        ${at.ngEditadoManualmente ? `<div class="pill warn-pill" style="background:var(--warn-bg); color:var(--warn); padding:6px 12px; border-radius:6px; font-size:12px; margin-top:8px; display:inline-block;">⚠ Valor de N_G editado manualmente (original da norma: ${at.ngOriginal})</div>` : ""}
      </div>` : ""}
    `;
  }

  function ngCard(at) {
    return `
      <div class="risk-card" style="max-width:420px;">
        <div class="risk-card-head"><div class="risk-card-name">${esc(at.municipio)} — ${esc(at.estado)}</div></div>
        <div class="risk-card-val">N_G = ${at.ng} raios/km²/ano</div>
        <div class="risk-card-tol">Fonte: ABNT NBR 5419-2:2026, Tabela F.1 (Anexo F, normativo)</div>
      </div>
    `;
  }

  function bind(a) {
    const input = document.getElementById("f-buscaMunicipio");
    const lista = document.getElementById("lista-municipios");
    if (!input) return;

    input.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (q.length < 2) { lista.style.display = "none"; return; }
      const resultados = NEMAX_MUNICIPIOS.filter((m) => m[0].toLowerCase().includes(q)).slice(0, 10);
      if (resultados.length === 0) { lista.style.display = "none"; return; }
      lista.innerHTML = resultados.map((m) =>
        `<div style="padding:9px 12px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--gray-mid);"
              onmousedown="M_Atmosferico.selecionar('${m[0].replace(/'/g, "\\'")}', '${m[1]}', ${m[2]})">
           ${m[0]} <span style="color:var(--gray-text); font-size:11.5px;">— ${m[1]} · N_G ${m[2]}</span>
         </div>`
      ).join("");
      lista.style.display = "block";
    });
    input.addEventListener("blur", () => setTimeout(() => (lista.style.display = "none"), 150));
  }

  function selecionar(municipio, uf, ng) {
    const a = App.getCurrentAnalise();
    a.atmosferico = { estado: uf, municipio: municipio, ng: ng, ngOriginal: ng, ngEditadoManualmente: false };
    salvarAnalise(a);
    App.render();
  }

  function alterarManual(val) {
    const a = App.getCurrentAnalise();
    const novoNg = parseFloat(val);
    if (isNaN(novoNg)) return;
    a.atmosferico.ng = novoNg;
    a.atmosferico.ngEditadoManualmente = novoNg !== a.atmosferico.ngOriginal;
    salvarAnalise(a);
  }

  function coletar() {} // dados já persistidos via selecionar/alterarManual

  return { render, bind, coletar, selecionar, alterarManual };
})();


/* ============================================================
   MÓDULO 4 — LINHAS CONECTADAS (energia e sinal)
   ============================================================ */

const M_Linhas = (function () {
  function render(a) {
    const l = a.linhas;
    return `
      <div class="subsection">
        <div class="subsection-title">Linhas de energia</div>
        <div id="linhas-energia">${l.energia.map((ln, i) => linhaBlock("energia", ln, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_Linhas.addLinha('energia')">＋ Adicionar linha de energia</button>
      </div>

      <div class="subsection">
        <div class="subsection-title">Linhas de sinal</div>
        <div id="linhas-sinal">${l.sinal.map((ln, i) => linhaSinalBlock(ln, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_Linhas.addLinha('sinal')">＋ Adicionar linha de sinal</button>
      </div>

      <p style="font-size:12.5px; color:var(--gray-text); margin-top:16px; line-height:1.6;">
        Conforme A.4.2 e 6.4.5/6.5.5, quando o comprimento for desconhecido assume-se L_L = 1 000 m,
        e quando houver mais de uma linha com o mesmo roteamento, calcula-se apenas a de piores
        características (maior N_L, menor U_W). Para análise simplificada de trecho único,
        deixe uma linha representativa de cada tipo.
      </p>
    `;
  }

  function linhaBlock(tipo, ln, i) {
    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_Linhas.removerLinha('${tipo}', ${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Comprimento (m)</label><input type="number" class="ln-${tipo}-comprimento" data-i="${i}" value="${ln.comprimento || 1000}"></div>
          <div class="field"><label>Instalação</label>
            <select class="ln-${tipo}-instalacao" data-i="${i}">
              <option value="aerea" ${ln.instalacao === "aerea" ? "selected" : ""}>Aérea</option>
              <option value="subterranea" ${ln.instalacao === "subterranea" ? "selected" : ""}>Subterrânea</option>
            </select>
          </div>
          <div class="field"><label>Ambiente (C_E)</label>
            <select class="ln-${tipo}-ambiente" data-i="${i}">
              <option value="1" ${ln.ambiente == 1 ? "selected" : ""}>Rural</option>
              <option value="0.5" ${ln.ambiente == 0.5 ? "selected" : ""}>Suburbano</option>
              <option value="0.1" ${ln.ambiente == 0.1 ? "selected" : ""}>Urbano</option>
              <option value="0.01" ${ln.ambiente == 0.01 ? "selected" : ""}>Urbano, estruturas &gt;20m</option>
            </select>
          </div>
          <div class="field"><label>Tipo (C_T)</label>
            <select class="ln-${tipo}-tipoLinha" data-i="${i}">
              <option value="1" ${ln.tipoLinha == 1 ? "selected" : ""}>Energia BT ou sinal</option>
              <option value="0.2" ${ln.tipoLinha == 0.2 ? "selected" : ""}>Energia AT (transformador AT/BT)</option>
            </select>
          </div>
          <div class="field"><label>Classe de tensão</label><input type="text" class="ln-${tipo}-classeTensao" data-i="${i}" value="${esc(ln.classeTensao || "")}" placeholder="ex: 220V"></div>
          <div class="field"><label>Blindada?</label>
            <select class="ln-${tipo}-blindada" data-i="${i}">
              <option value="nao" ${ln.blindada === "nao" ? "selected" : ""}>Não blindada</option>
              <option value="sim" ${ln.blindada === "sim" ? "selected" : ""}>Blindada</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  function linhaSinalBlock(ln, i) {
    const tipos = ["Internet", "Telefonia", "Fibra", "Controle", "Automação", "CFTV", "Alarme", "Outros"];
    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_Linhas.removerLinha('sinal', ${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Tipo</label>
            <select class="ln-sinal-subtipo" data-i="${i}">${tipos.map((t) => `<option ${ln.subtipo === t ? "selected" : ""}>${t}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Comprimento (m)</label><input type="number" class="ln-sinal-comprimento" data-i="${i}" value="${ln.comprimento || 1000}"></div>
          <div class="field"><label>Instalação</label>
            <select class="ln-sinal-instalacao" data-i="${i}">
              <option value="aerea" ${ln.instalacao === "aerea" ? "selected" : ""}>Aérea</option>
              <option value="subterranea" ${ln.instalacao === "subterranea" ? "selected" : ""}>Subterrânea</option>
            </select>
          </div>
          <div class="field"><label>Ambiente (C_E)</label>
            <select class="ln-sinal-ambiente" data-i="${i}">
              <option value="1" ${ln.ambiente == 1 ? "selected" : ""}>Rural</option>
              <option value="0.5" ${ln.ambiente == 0.5 ? "selected" : ""}>Suburbano</option>
              <option value="0.1" ${ln.ambiente == 0.1 ? "selected" : ""}>Urbano</option>
              <option value="0.01" ${ln.ambiente == 0.01 ? "selected" : ""}>Urbano, estruturas &gt;20m</option>
            </select>
          </div>
          <div class="field"><label>Blindada?</label>
            <select class="ln-sinal-blindada" data-i="${i}">
              <option value="nao" ${ln.blindada === "nao" ? "selected" : ""}>Não blindada</option>
              <option value="sim" ${ln.blindada === "sim" ? "selected" : ""}>Blindada</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  function addLinha(tipo) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    if (tipo === "energia") {
      a.linhas.energia.push({ comprimento: 1000, instalacao: "aerea", ambiente: 0.5, tipoLinha: 1, classeTensao: "", blindada: "nao" });
    } else {
      a.linhas.sinal.push({ subtipo: "Internet", comprimento: 1000, instalacao: "aerea", ambiente: 0.5, blindada: "nao" });
    }
    salvarAnalise(a);
    App.render();
  }

  function removerLinha(tipo, i) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.linhas[tipo].splice(i, 1);
    salvarAnalise(a);
    App.render();
  }

  function bind() {}

  function coletar(a) {
    a.linhas.energia.forEach((ln, i) => {
      ln.comprimento = parseFloat(qs(`.ln-energia-comprimento[data-i="${i}"]`)?.value) || 1000;
      ln.instalacao = qs(`.ln-energia-instalacao[data-i="${i}"]`)?.value || "aerea";
      ln.ambiente = parseFloat(qs(`.ln-energia-ambiente[data-i="${i}"]`)?.value) || 0.5;
      ln.tipoLinha = parseFloat(qs(`.ln-energia-tipoLinha[data-i="${i}"]`)?.value) || 1;
      ln.classeTensao = qs(`.ln-energia-classeTensao[data-i="${i}"]`)?.value || "";
      ln.blindada = qs(`.ln-energia-blindada[data-i="${i}"]`)?.value || "nao";
    });
    a.linhas.sinal.forEach((ln, i) => {
      ln.subtipo = qs(`.ln-sinal-subtipo[data-i="${i}"]`)?.value || "Internet";
      ln.comprimento = parseFloat(qs(`.ln-sinal-comprimento[data-i="${i}"]`)?.value) || 1000;
      ln.instalacao = qs(`.ln-sinal-instalacao[data-i="${i}"]`)?.value || "aerea";
      ln.ambiente = parseFloat(qs(`.ln-sinal-ambiente[data-i="${i}"]`)?.value) || 0.5;
      ln.blindada = qs(`.ln-sinal-blindada[data-i="${i}"]`)?.value || "nao";
    });
  }

  function qs(sel) { return document.querySelector(sel); }

  return { render, bind, coletar, addLinha, removerLinha };
})();


/* ============================================================
   MÓDULO 5 — FONTES DE DANO (S1, S2, S3, S4)
   Norma: 4.1.1, Tabela 1
   ============================================================ */

const M_Fontes = (function () {
  const FONTES = [
    { id: "S1", titulo: "S1 — Descargas atmosféricas na estrutura", desc: "Origina R_A (D1), R_B (D2) e R_C (D3, apenas estruturas com risco de explosão ou perigo imediato à vida)." },
    { id: "S2", titulo: "S2 — Descargas atmosféricas próximo da estrutura", desc: "Origina R_M (D3, apenas estruturas com risco de explosão ou perigo imediato à vida)." },
    { id: "S3", titulo: "S3 — Descargas atmosféricas na linha elétrica conectada", desc: "Origina R_U (D1), R_V (D2) e R_W (D3, condicional). Requer linhas conectadas (Módulo 4)." },
    { id: "S4", titulo: "S4 — Descargas atmosféricas próximo da linha elétrica conectada", desc: "Origina R_Z (D3, condicional). Requer linhas conectadas (Módulo 4)." },
  ];

  function render(a) {
    const f = a.fontesDano;
    return `
      <p style="font-size:13px; color:var(--gray-text); margin-bottom:18px; line-height:1.6;">
        Selecione quais fontes de dano se aplicam à edificação, conforme 4.1.1 e Tabela 1 da norma.
        S1 e S2 aplicam-se a toda estrutura; S3 e S4 só fazem sentido se houver linhas elétricas
        conectadas (Módulo 4). Os componentes de risco de cada fonte serão somados em R1 e R3
        conforme as Equações (1) e (2), Tabela 2.
      </p>
      <div class="tag-grid">
        ${FONTES.map((s) => `
          <div class="source-card ${f[s.id] ? "active" : ""}" onclick="M_Fontes.toggle('${s.id}')">
            <div class="source-card-title">${s.titulo}</div>
            <div class="source-card-desc">${s.desc}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function toggle(id) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.fontesDano[id] = !a.fontesDano[id];
    salvarAnalise(a);
    App.render();
  }

  function bind() {}
  function coletar() {} // já persistido via toggle

  return { render, bind, coletar, toggle };
})();


/* ============================================================
   MÓDULO 6 — MEDIDAS DE PROTEÇÃO (existentes ou propostas)
   Alimenta as probabilidades do Anexo B
   ============================================================ */

const M_Protecoes = (function () {
  function render(a) {
    const p = a.protecoes;
    const opt = (arr, sel, valKey) => arr.map((o, i) => {
      const v = valKey ? o[valKey] : o.value;
      return `<option value="${v}" ${sel == v ? "selected" : ""}>${o.label}</option>`;
    }).join("");

    return `
      <div class="subsection">
        <div class="subsection-title">SPDA — proteção contra choque e danos físicos (Tabelas B.1, B.2)</div>
        <div class="field-grid">
          <div class="field"><label>Nível de proteção do SPDA (NP) — define P_B</label>
            <select id="f-npSpda">
              <option value="nenhum" ${p.npSpda === "nenhum" ? "selected" : ""}>Sem SPDA (P_B = 1)</option>
              <option value="IV" ${p.npSpda === "IV" ? "selected" : ""}>NP IV (P_B = 0,2)</option>
              <option value="III" ${p.npSpda === "III" ? "selected" : ""}>NP III (P_B = 0,1)</option>
              <option value="II" ${p.npSpda === "II" ? "selected" : ""}>NP II (P_B = 0,05)</option>
              <option value="I" ${p.npSpda === "I" ? "selected" : ""}>NP I (P_B = 0,02)</option>
            </select>
          </div>
          <div class="field"><label>Proteção contra tensão de toque/passo (P_TA — Tabela B.1)</label>
            <select id="f-medidaToquePasso">${opt(NEMAX_CALC.tabelas.B1_PTA, p.medidaToquePasso)}</select>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">DPS — proteção de sistemas internos (Tabela B.3)</div>
        <div class="field-grid">
          <div class="field"><label>Sistema coordenado de DPS — NP para o qual foi projetado (P_SPD)</label>
            <select id="f-npDPS">
              <option value="nenhum" ${p.npDPS === "nenhum" ? "selected" : ""}>Nenhum sistema coordenado (P_SPD = 1)</option>
              <option value="III-IV" ${p.npDPS === "III-IV" ? "selected" : ""}>NP III-IV (P_SPD = 0,05)</option>
              <option value="II" ${p.npDPS === "II" ? "selected" : ""}>NP II (P_SPD = 0,02)</option>
              <option value="I" ${p.npDPS === "I" ? "selected" : ""}>NP I (P_SPD = 0,01)</option>
            </select>
          </div>
          <div class="field"><label>DPS classe I na entrada da linha — NP (P_EB — Tabela B.7)</label>
            <select id="f-npDPSClasseI">
              <option value="nenhum" ${p.npDPSClasseI === "nenhum" ? "selected" : ""}>Sem DPS classe I (P_EB = 1)</option>
              <option value="III-IV" ${p.npDPSClasseI === "III-IV" ? "selected" : ""}>NP III-IV (P_EB = 0,05)</option>
              <option value="II" ${p.npDPSClasseI === "II" ? "selected" : ""}>NP II (P_EB = 0,02)</option>
              <option value="I" ${p.npDPSClasseI === "I" ? "selected" : ""}>NP I (P_EB = 0,01)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Linha elétrica — blindagem e isolação (Tabela B.4, C_LD/C_LI)</div>
        <div class="field-grid">
          <div class="field span-2"><label>Condição da linha elétrica conectada</label>
            <select id="f-condicaoLinha">${NEMAX_CALC.tabelas.B4_CLD_CLI.map((o, i) => `<option value="${i}" ${p.condicaoLinha == i ? "selected" : ""}>${o.label}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Proteção contra toque na linha (P_TU — Tabela B.6)</label>
            <select id="f-medidaToqueLinha">${opt(NEMAX_CALC.tabelas.B6_PTU, p.medidaToqueLinha)}</select>
          </div>
          <div class="field"><label>Tensão suportável nominal de impulso U_W (kV)</label>
            <select id="f-tensaoSuportavel">
              ${[0.35, 0.5, 1, 1.5, 2.5, 4, 6].map((v) => `<option value="${v}" ${p.tensaoSuportavel == v ? "selected" : ""}>${v} kV</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Resistência da blindagem do cabo (P_LD — Tabela B.8)</label>
            <select id="f-resistenciaBlindagem">
              ${NEMAX_CALC.tabelas.B8_PLD.linhas.map((l, i) => `<option value="${i}" ${p.resistenciaBlindagem == i ? "selected" : ""}>${l.label}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Blindagem espacial e fiação interna (P_MS — Tabela B.5, Eq. B.4-B.7)</div>
        <div class="field-grid">
          <div class="field"><label>Largura da malha de blindagem w_m (m)</label><input type="number" step="0.1" id="f-wm" value="${p.wm}"><span class="hint">Usado para K_S1 = K_S2 = 0,12 × w_m</span></div>
          <div class="field"><label>Tipo de fiação interna (K_S3 — Tabela B.5)</label>
            <select id="f-ks3Tipo">${opt(NEMAX_CALC.tabelas.B5_KS3, p.ks3Tipo)}</select>
          </div>
        </div>
      </div>

      ${renderPainelConsistenciaProtecoes(a)}
    `;
  }

  function bind() {}

  function bind(a) {
    // Mesmo padrão usado em M_DimensionamentoSPDA.bind(): re-renderiza ao
    // alterar um campo que afeta o painel de consistência cruzada exibido
    // ao final do módulo (renderPainelConsistenciaProtecoes). Sem este
    // listener, o painel só seria recalculado ao avançar de módulo, ficando
    // visualmente desatualizado enquanto o usuário ainda preenche este.
    const idsRerender = ["f-condicaoLinha"];
    idsRerender.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    });
  }

  function coletar(a) {
    const g = (id) => document.getElementById(id).value;
    a.protecoes = {
      npSpda: g("f-npSpda"),
      medidaToquePasso: parseFloat(g("f-medidaToquePasso")),
      npDPS: g("f-npDPS"),
      npDPSClasseI: g("f-npDPSClasseI"),
      condicaoLinha: parseInt(g("f-condicaoLinha")),
      medidaToqueLinha: parseFloat(g("f-medidaToqueLinha")),
      tensaoSuportavel: parseFloat(g("f-tensaoSuportavel")),
      resistenciaBlindagem: parseInt(g("f-resistenciaBlindagem")),
      wm: parseFloat(g("f-wm")) || 10,
      ks3Tipo: parseFloat(g("f-ks3Tipo")),
    };
  }

  return { render, bind, coletar };
})();


/* ============================================================
   MÓDULO 10 — DIMENSIONAMENTO FÍSICO DE SPDA (ABNT NBR 5419-3:2026)
   Usa o motor NEMAX_CALC_P3. Herda o Nível de Proteção (NP) definido
   no Módulo 6 (Proteções) da análise de risco — a.protecoes.npSpda.
   ============================================================ */

function novoEstadoDimensionamento() {
  return {
    // Captação
    metodoCaptacao: "esfera", // esfera | angulo | malha
    alturaCaptor: "",
    meioIsolacao: "ar", // ar | solido — usado também na distância de segurança

    // Descida
    perimetroEstrutura: "",
    descidaIsolada: false,

    // Aterramento
    resistividadeSolo: "",
    areaEletrodo: "",

    // Distância de segurança — caso selecionado
    casoKc: "1", // 1 | 2 | 3central | multiplas | simplificada
    kcH: "",
    kcC: "",
    kcN: "",
    kcManual: "", // usado quando o profissional já obteve kc por procedimento gráfico (malha/anel/extremidade)
    sComprimentoL: "",

    // Materiais — apenas seleção para referência cruzada às tabelas
    materialCaptacao: "Cobre",
    materialAterramento: "Cobre",
  };
}

const M_DimensionamentoSPDA = (function () {
  function miniStatP3(label, val, norma) {
    return `<div class="risk-card" style="padding:12px 14px;">
      <div style="font-size:11.5px; color:var(--gray-text); margin-bottom:4px;">${label}</div>
      <div style="font-family:'Courier New',monospace; font-weight:700; font-size:14px; color:var(--navy);">${val}</div>
      ${norma ? `<div style="font-size:10px; color:var(--copper); margin-top:2px;">${norma}</div>` : ""}
    </div>`;
  }

  function fmtM(v, casas, sufixo) {
    casas = casas === undefined ? 2 : casas;
    sufixo = sufixo === undefined ? " m" : sufixo;
    if (v === null || v === undefined || isNaN(v)) return "—";
    return v.toFixed(casas) + sufixo;
  }

  function npAtual(a) {
    return a.protecoes ? a.protecoes.npSpda : "nenhum";
  }

  function render(a) {
    if (!a.dimensionamento) a.dimensionamento = novoEstadoDimensionamento();
    sincronizarKcN(a);
    const d = a.dimensionamento;
    const NP = npAtual(a);

    if (NP === "nenhum") {
      return `
        <div style="text-align:center; padding:50px 20px;">
          <p style="color:var(--gray-text); margin-bottom:10px; max-width:480px; margin:0 auto 16px;">
            Nenhum Nível de Proteção (NP) de SPDA foi definido na análise de risco (Módulo 6 — Proteções).
            O dimensionamento físico da NBR 5419-3 depende diretamente do NP resultante da NBR 5419-2.
          </p>
          <button class="btn btn-secondary" onclick="App.irParaModulo(5)">← Ir para o Módulo 6 (Proteções)</button>
        </div>`;
    }

    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];

    return `
      <div class="verdict-banner ok" style="margin-bottom:22px;">
        <div class="verdict-banner-label">Nível de Proteção herdado da análise de risco (Módulo 6)</div>
        <div class="verdict-banner-main">NP ${NP}</div>
        <div class="verdict-banner-detail">Raio da esfera rolante: ${tab2.raioEsfera} m · Malha: ${tab2.malhaLabel} m · Distância entre descidas (Tabela 5): ${NEMAX_CALC_P3.tabelas.TABELA5_DIST_DESCIDA[NP]} m</div>
      </div>

      ${renderPainelConsistencia(a)}

      <div class="subsection">
        <div class="subsection-title">Subsistema de captação — posicionamento (5.3.2, Anexo A)</div>
        <div class="field-grid">
          <div class="field"><label>Método de posicionamento</label>
            <select id="f-metodoCaptacao">
              <option value="esfera" ${d.metodoCaptacao === "esfera" ? "selected" : ""}>Esfera rolante (adequado em todos os casos — 5.3.2.4)</option>
              <option value="angulo" ${d.metodoCaptacao === "angulo" ? "selected" : ""}>Ângulo de proteção (estruturas simples, sujeito a limite de altura)</option>
              <option value="malha" ${d.metodoCaptacao === "malha" ? "selected" : ""}>Malha (coberturas planas — não aplicável a superfícies curvas)</option>
            </select>
          </div>
          ${d.metodoCaptacao === "angulo" ? `
          <div class="field"><label>Altura H do captor acima do plano de referência (m)</label>
            <input type="number" step="0.1" id="f-alturaCaptor" value="${esc(d.alturaCaptor)}"><span class="hint">5.3.2.12 — distância da extremidade superior do captor ao plano de referência</span></div>
          ` : ""}
        </div>
        ${renderCaptacao(NP, d)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Subsistema de descida — número e espaçamento (5.4.3, Tabela 5)</div>
        <div class="field-grid">
          <div class="field"><label>Perímetro da estrutura (m)</label>
            <input type="number" step="0.1" id="f-perimetroEstrutura" value="${esc(d.perimetroEstrutura)}"></div>
          <div class="field"><label>SPDA isolado da estrutura?</label>
            <select id="f-descidaIsolada">
              <option value="false" ${!d.descidaIsolada ? "selected" : ""}>Não isolado (fixado à estrutura — caso mais comum)</option>
              <option value="true" ${d.descidaIsolada ? "selected" : ""}>Isolado (distância de segurança observada — 5.4.2)</option>
            </select>
          </div>
        </div>
        ${renderDescida(NP, d)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Subsistema de aterramento — comprimento mínimo do eletrodo (5.5.2, Figura 3)</div>
        <div class="field-grid">
          <div class="field"><label>Resistividade do solo ρ (Ω·m)</label>
            <input type="number" step="1" id="f-resistividadeSolo" value="${esc(d.resistividadeSolo)}"><span class="hint">ABNT NBR 7117-1 — medição de resistividade</span></div>
          <div class="field"><label>Área abrangida pelo eletrodo de aterramento (m²)</label>
            <input type="number" step="0.1" id="f-areaEletrodo" value="${esc(d.areaEletrodo)}"><span class="hint">Área do círculo/polígono envolvido pelo anel ou pela fundação utilizada como eletrodo natural</span></div>
        </div>
        ${renderAterramento(NP, d)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Distância de segurança "s" (6.3, Anexo C)</div>
        <div class="field-grid">
          <div class="field"><label>Meio isolante entre as partes (km — Tabela 12)</label>
            <select id="f-meioIsolacao">
              <option value="ar" ${d.meioIsolacao === "ar" ? "selected" : ""}>Ar (km = 1)</option>
              <option value="solido" ${d.meioIsolacao === "solido" ? "selected" : ""}>Sólido (km = 0,5)</option>
            </select>
          </div>
          <div class="field"><label>Caso de cálculo de kc (Anexo C)</label>
            <select id="f-casoKc">
              <option value="1" ${d.casoKc === "1" ? "selected" : ""}>1 descida — SPDA isolado (kc = 1, Fig. C.3)</option>
              <option value="2" ${d.casoKc === "2" ? "selected" : ""}>2 descidas (Fig. C.4)</option>
              <option value="3central" ${d.casoKc === "3central" ? "selected" : ""}>3 descidas — impacto na descida central (Fig. C.5)</option>
              <option value="multiplas" ${d.casoKc === "multiplas" ? "selected" : ""}>4 ou mais descidas (Fig. C.7, n ≥ 4)</option>
              <option value="tabela13" ${d.casoKc === "tabela13" ? "selected" : ""}>Simplificado por nº de descidas (Tabela 13, Eq. 5)</option>
              <option value="manual" ${d.casoKc === "manual" ? "selected" : ""}>Outro caso (3 descidas/extremidade, malha, anéis — kc obtido manualmente)</option>
            </select>
          </div>
        </div>
        ${renderCasoKc(d)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Materiais e seções mínimas — referência (5.7, Tabelas 7 e 8)</div>
        <div class="field-grid">
          <div class="field"><label>Material — captação/descida</label>
            <select id="f-materialCaptacao">${optMaterial(NEMAX_CALC_P3.tabelas.TABELA7_CONDUTORES, d.materialCaptacao)}</select>
          </div>
          <div class="field"><label>Material — eletrodo de aterramento</label>
            <select id="f-materialAterramento">${optMaterial(NEMAX_CALC_P3.tabelas.TABELA8_ELETRODOS, d.materialAterramento)}</select>
          </div>
        </div>
        ${renderTabelaMateriais(d)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Desenho esquemático (planta simplificada)</div>
        ${renderDesenhoEsquematico(a)}
      </div>

      <div class="subsection">
        <div class="subsection-title">Memorial descritivo automático</div>
        <div style="background:#fdfcfa; border:1px solid #e2ddd2; border-radius:8px; padding:18px 20px; max-height:420px; overflow-y:auto;">
          ${gerarMemorialDescritivo(a)}
        </div>
        <p style="font-size:11px; color:var(--gray-text); margin-top:8px;">Texto gerado automaticamente a partir dos dados preenchidos acima; incluído no relatório PDF final. Revise antes de assinar.</p>
      </div>

      <div class="subsection">
        <div class="subsection-title">Quantitativo estimado de materiais</div>
        ${renderQuantitativoMateriais(a)}
      </div>
    `;
  }

  function renderDesenhoEsquematico(a) {
    const svg = gerarDesenhoEsquematico(a);
    if (!svg) {
      return `<p style="font-size:12.5px; color:var(--gray-text);">Informe comprimento e largura da estrutura (Módulo 2) para gerar o desenho esquemático.</p>`;
    }
    return svg;
  }

  function optMaterial(tabela, selecionado) {
    const materiais = Array.from(new Set(tabela.map((t) => t.material)));
    return materiais.map((m) => `<option value="${esc(m)}" ${selecionado === m ? "selected" : ""}>${esc(m)}</option>`).join("");
  }

  function renderTabelaMateriais(d) {
    const linhasCaptacao = NEMAX_CALC_P3.tabelas.TABELA7_CONDUTORES.filter((t) => t.material === d.materialCaptacao);
    const linhasAterramento = NEMAX_CALC_P3.tabelas.TABELA8_ELETRODOS.filter((t) => t.material === d.materialAterramento);
    return `
      <div style="margin-top:14px;">
        <table class="hist-table" style="font-size:12.5px;">
          <thead><tr><th>Configuração</th><th>Seção mínima</th><th>Dimensão</th></tr></thead>
          <tbody>
            ${linhasCaptacao.map((l) => `<tr><td>${esc(l.config)}</td><td>${l.secaoMM2} mm²</td><td>${esc(l.dimensao)}</td></tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:11px; color:var(--gray-text); margin-top:6px;">Captação/descida não naturais — ABNT NBR 5419-3:2026, Tabela 7.</p>
        <table class="hist-table" style="font-size:12.5px; margin-top:14px;">
          <thead><tr><th>Configuração</th><th>Eletrodo não cravado</th><th>Eletrodo cravado</th><th>Espessura</th></tr></thead>
          <tbody>
            ${linhasAterramento.map((l) => `<tr><td>${esc(l.config)}</td><td>${l.naoCravadoMM2 ? l.naoCravadoMM2 + " mm²" : "—"}</td><td>${esc(l.cravado)}</td><td>${esc(l.espessura)}</td></tr>`).join("")}
          </tbody>
        </table>
        <p style="font-size:11px; color:var(--gray-text); margin-top:6px;">Eletrodo de aterramento não natural — ABNT NBR 5419-3:2026, Tabela 8.</p>
      </div>
    `;
  }

  function renderCaptacao(NP, d) {
    if (d.metodoCaptacao === "angulo") {
      const H = parseFloat(d.alturaCaptor);
      if (!H) return `<p style="font-size:12.5px; color:var(--gray-text); margin-top:10px;">Informe a altura H do captor para calcular o ângulo de proteção.</p>`;
      const r = NEMAX_CALC_P3.calc_anguloProtecao(NP, H);
      if (!r.aplicavel) {
        return `<div class="protection-card" style="border-left-color:var(--fail); margin-top:14px;">
          <div class="protection-card-title">Método do ângulo de proteção não aplicável</div>
          <div class="protection-card-desc">${esc(r.substituicao)}</div>
        </div>`;
      }
      return `<div class="field-grid cols-3" style="margin-top:14px;">
        ${miniStatP3("Ângulo de proteção α", r.value.toFixed(1) + "°", r.norma)}
        ${miniStatP3("Raio de proteção na base", fmtM(r.raioProtecaoBase), "r = H × tan(α)")}
        ${miniStatP3("Altura efetiva considerada", fmtM(Math.max(2, H)), "5.3.2.13")}
      </div>`;
    }
    if (d.metodoCaptacao === "esfera") {
      const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
      return `<div class="field-grid cols-3" style="margin-top:14px;">
        ${miniStatP3("Raio da esfera rolante R", tab2.raioEsfera + " m", "Tabela 2 — NP " + NP)}
      </div>
      <p style="font-size:12px; color:var(--gray-text); margin-top:10px; line-height:1.6;">Nenhum ponto da estrutura pode entrar em contato com uma esfera fictícia de raio ${tab2.raioEsfera} m rolando ao redor e sobre a estrutura, em qualquer direção (Anexo A.2.1). Posicionamento físico depende da geometria 3D da edificação e deve ser verificado em projeto/maquete.</p>`;
    }
    // malha
    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
    return `<div class="field-grid cols-3" style="margin-top:14px;">
      ${miniStatP3("Módulo máximo da malha", tab2.malhaLabel + " m", "Tabela 2 — NP " + NP)}
    </div>
    <p style="font-size:12px; color:var(--gray-text); margin-top:10px; line-height:1.6;">Captores na periferia da cobertura e nas saliências; para coberturas com inclinação &gt; 10 %, módulos sobre as cumeeiras (5.3.2.6). Uma das dimensões do módulo pode ser aumentada em até 25 %, desde que o perímetro do módulo não aumente (5.3.2.7). Não aplicável a superfícies curvas (5.3.2.5).</p>`;
  }

  function renderDescida(NP, d) {
    const perimetro = parseFloat(d.perimetroEstrutura);
    if (!perimetro) return `<p style="font-size:12.5px; color:var(--gray-text); margin-top:10px;">Informe o perímetro da estrutura para calcular o número mínimo de descidas.</p>`;
    if (d.descidaIsolada) {
      return `<p style="font-size:12.5px; color:var(--gray-text); margin-top:10px; line-height:1.6;">SPDA isolado: pelo menos um condutor de descida (natural ou não natural) é necessário para cada mastro não metálico, ou em cada ponto de ancoragem de condutores suspensos/rede aérea (5.4.2.1). O cálculo por perímetro/Tabela 5 aplica-se apenas a SPDA não isolado.</p>`;
    }
    const r = NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP);
    const esp = NEMAX_CALC_P3.calc_espacamentoReal(perimetro, r.value);
    return `<div class="field-grid cols-3" style="margin-top:14px;">
      ${miniStatP3("Número mínimo de descidas", r.value, r.norma)}
      ${miniStatP3("Espaçamento real entre descidas", fmtM(esp.value), "5.4.3.2")}
      ${miniStatP3("Distância nominal (Tabela 5)", r.distanciaTabela + " m", "NP " + NP)}
    </div>`;
  }

  function renderAterramento(NP, d) {
    const rho = parseFloat(d.resistividadeSolo);
    const area = parseFloat(d.areaEletrodo);
    if (!rho) return `<p style="font-size:12.5px; color:var(--gray-text); margin-top:10px;">Informe a resistividade do solo para calcular o comprimento mínimo l1 do eletrodo.</p>`;
    const rl1 = NEMAX_CALC_P3.calc_comprimentoMinEletrodo(NP, rho);
    let blocos = `<div class="field-grid cols-3" style="margin-top:14px;">
      ${miniStatP3("Comprimento mínimo l1", fmtM(rl1.value), rl1.norma)}
    </div>`;
    if (area) {
      const rRe = NEMAX_CALC_P3.calc_raioEquivalenteEletrodo(area);
      const rDisp = NEMAX_CALC_P3.calc_dispensaComplementacao(rRe.value, rl1.value);
      blocos += `<div class="field-grid cols-3" style="margin-top:10px;">
        ${miniStatP3("Raio equivalente re", fmtM(rRe.value), rRe.norma)}
        ${miniStatP3("Complementação do eletrodo", rDisp.value ? "Dispensada" : "Necessária", rDisp.norma)}
      </div>`;
      if (!rDisp.value) {
        const comp = NEMAX_CALC_P3.calc_eletrodoComplementar(rRe.value, rl1.value);
        blocos += `<div class="field-grid cols-3" style="margin-top:10px;">
          ${miniStatP3("Eletrodo radial lr (por descida)", fmtM(comp.lr.value), comp.lr.norma)}
          ${miniStatP3("Eletrodo vertical lv (por descida)", fmtM(comp.lv.value), comp.lv.norma)}
        </div>`;
      }
    } else {
      blocos += `<p style="font-size:12px; color:var(--gray-text); margin-top:8px;">Informe a área abrangida pelo eletrodo para verificar a necessidade de complementação (5.5.2.3).</p>`;
    }
    return blocos;
  }

  function renderCasoKc(d, nDescidasRef) {
    let camposExtras = "";
    if (d.casoKc === "2" || d.casoKc === "3central" || d.casoKc === "multiplas") {
      camposExtras += `<div class="field"><label>h (m) — altura do captor até o eletrodo de aterramento</label><input type="number" step="0.1" id="f-kcH" value="${esc(d.kcH)}"></div>`;
      camposExtras += `<div class="field"><label>c (m) — ${d.casoKc === "multiplas" ? "espaçamento entre descidas" : "comprimento ao longo do captor entre descidas"}</label><input type="number" step="0.1" id="f-kcC" value="${esc(d.kcC)}"></div>`;
    }
    if (d.casoKc === "multiplas" || d.casoKc === "tabela13") {
      const refTexto = nDescidasRef != null
        ? `<span class="hint">Subsistema de descida calculou ${nDescidasRef} condutor(es) para o perímetro informado${(parseInt(d.kcN) && parseInt(d.kcN) !== nDescidasRef) ? " — valor abaixo diverge do calculado" : ""}.</span>`
        : `<span class="hint">Informe o perímetro no bloco "Descida" para referência automática.</span>`;
      camposExtras += `<div class="field"><label>n — número de condutores de descida</label><input type="number" step="1" id="f-kcN" value="${esc(d.kcN)}">${refTexto}</div>`;
    }
    if (d.casoKc === "manual") {
      camposExtras += `<div class="field"><label>kc obtido (procedimento gráfico — Fig. C.6, C.8 ou C.9)</label><input type="number" step="0.01" id="f-kcManual" value="${esc(d.kcManual)}"><span class="hint">Para impacto em descida de extremidade (3 descidas), captação em malha ou anéis intermediários, a norma define o coeficiente por procedimento gráfico/algorítmico específico (Anexo C, C.3.3 nota, C.3.5, C.3.6), não redutível a uma fórmula única.</span></div>`;
    }
    camposExtras += `<div class="field"><label>l (m) — comprimento do trecho até a ligação equipotencial</label><input type="number" step="0.1" id="f-sComprimentoL" value="${esc(d.sComprimentoL)}"></div>`;

    return `
      <div class="field-grid" style="margin-top:14px;">${camposExtras}</div>
      <div id="resultado-kc-s" style="margin-top:14px;"></div>
    `;
  }

  function calcularEExibirKcS(a) {
    const d = a.dimensionamento;
    const NP = npAtual(a);
    if (NP === "nenhum") return;
    const ki = NEMAX_CALC_P3.tabelas.TABELA11_KI[NP];
    const km = NEMAX_CALC_P3.tabelas.TABELA12_KM[d.meioIsolacao];
    const l = parseFloat(d.sComprimentoL);

    const rKc = NEMAX_CALC_P3.resolverKc(d);

    const el = document.getElementById("resultado-kc-s");
    if (!el) return;
    if (!rKc || rKc.value == null || !l) {
      el.innerHTML = `<p style="font-size:12px; color:var(--gray-text);">Preencha os campos acima para calcular kc e a distância de segurança s.</p>`;
      return;
    }
    const rS = NEMAX_CALC_P3.calc_distanciaSeguranca_simplificada(NP, d.meioIsolacao, rKc.value, l);
    el.innerHTML = `<div class="field-grid cols-3">
      ${miniStatP3("Coeficiente kc", rKc.value.toFixed(3), rKc.norma)}
      ${miniStatP3("Distância de segurança s", fmtM(rS.value), rS.norma)}
      ${miniStatP3("ki / km", `${ki} / ${km}`, "Tabelas 11 e 12 — NP " + NP)}
    </div>`;
  }

  function sincronizarKcN(a) {
    // Mantém kcN alinhado ao número de descidas calculado, sem sobrescrever
    // um valor que o usuário já tenha digitado manualmente e diferente.
    const d = a.dimensionamento;
    if (!(d.casoKc === "multiplas" || d.casoKc === "tabela13")) return;
    if (d.kcN) return; // não sobrescreve valor já preenchido pelo usuário
    const perim = parseFloat(d.perimetroEstrutura);
    const NPatual = npAtual(a);
    if (perim && !d.descidaIsolada && NPatual !== "nenhum") {
      d.kcN = String(NEMAX_CALC_P3.calc_numeroMinDescidas(perim, NPatual).value);
    }
  }

  function bind(a) {
    const idsRerender = ["f-metodoCaptacao", "f-alturaCaptor", "f-perimetroEstrutura", "f-descidaIsolada",
      "f-resistividadeSolo", "f-areaEletrodo", "f-materialCaptacao", "f-materialAterramento"];
    idsRerender.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        coletar(a);
        sincronizarKcN(a);
        salvarAnalise(a);
        App.render();
      });
    });

    // Campos da distância de segurança: mudam o caso (kc) com re-render completo,
    // mas os campos numéricos (h, c, n, l, kc manual) só recalculam o bloco de
    // resultado local, sem perder foco nem reconstruir o restante do formulário.
    const elCaso = document.getElementById("f-casoKc");
    if (elCaso) {
      elCaso.addEventListener("change", () => {
        coletar(a);
        sincronizarKcN(a);
        salvarAnalise(a);
        App.render();
      });
    }
    const idsLocais = ["f-meioIsolacao", "f-kcH", "f-kcC", "f-kcN", "f-kcManual", "f-sComprimentoL"];
    idsLocais.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => {
        coletar(a);
        salvarAnalise(a);
        calcularEExibirKcS(a);
      };
      el.addEventListener("change", handler);
      el.addEventListener("input", handler);
    });

    calcularEExibirKcS(a);
  }

  function coletar(a) {
    if (!a.dimensionamento) a.dimensionamento = novoEstadoDimensionamento();
    const d = a.dimensionamento;
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    if (g("f-metodoCaptacao") !== undefined) d.metodoCaptacao = g("f-metodoCaptacao");
    if (g("f-alturaCaptor") !== undefined) d.alturaCaptor = g("f-alturaCaptor");
    if (g("f-perimetroEstrutura") !== undefined) d.perimetroEstrutura = g("f-perimetroEstrutura");
    if (g("f-descidaIsolada") !== undefined) d.descidaIsolada = g("f-descidaIsolada") === "true";
    if (g("f-resistividadeSolo") !== undefined) d.resistividadeSolo = g("f-resistividadeSolo");
    if (g("f-areaEletrodo") !== undefined) d.areaEletrodo = g("f-areaEletrodo");
    if (g("f-meioIsolacao") !== undefined) d.meioIsolacao = g("f-meioIsolacao");
    if (g("f-casoKc") !== undefined) d.casoKc = g("f-casoKc");
    if (g("f-kcH") !== undefined) d.kcH = g("f-kcH");
    if (g("f-kcC") !== undefined) d.kcC = g("f-kcC");
    if (g("f-kcN") !== undefined) d.kcN = g("f-kcN");
    if (g("f-kcManual") !== undefined) d.kcManual = g("f-kcManual");
    if (g("f-sComprimentoL") !== undefined) d.sComprimentoL = g("f-sComprimentoL");
    if (g("f-materialCaptacao") !== undefined) d.materialCaptacao = g("f-materialCaptacao");
    if (g("f-materialAterramento") !== undefined) d.materialAterramento = g("f-materialAterramento");
  }

  return { render, bind, coletar };
})();


/* ============================================================
   INCREMENTOS DO MÓDULO 10 — DIMENSIONAMENTO FÍSICO DE SPDA
   1) Memorial descritivo automático (texto corrido)
   2) Lista de materiais / quantitativo estimado
   3) Desenho esquemático em SVG (planta simplificada)
   ============================================================ */

/* ----------------------------------------------------------
   1) MEMORIAL DESCRITIVO AUTOMÁTICO
   Monta um texto corrido em português técnico, condicional ao
   método/caso escolhido em cada subsistema. Usado tanto no
   Módulo 8 (pré-visualização) quanto no relatório PDF final.
   ---------------------------------------------------------- */
function gerarMemorialDescritivo(a) {
  const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
  if (NP === "nenhum" || !a.dimensionamento) {
    return "<p>Memorial não aplicável: nenhum Nível de Proteção de SPDA foi definido na análise de risco.</p>";
  }
  const d = a.dimensionamento;
  const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
  const e = a.estrutura || {};
  const partes = [];

  // --- Introdução ---
  partes.push(
    `O dimensionamento físico do Sistema de Proteção contra Descargas Atmosféricas (SPDA) externo da ` +
    `edificação foi elaborado em conformidade com a ABNT NBR 5419-3:2026, a partir do Nível de Proteção ` +
    `(NP) ${esc(NP)}, definido pela análise de risco realizada conforme a ABNT NBR 5419-2:2026. ` +
    `Ao NP ${esc(NP)} correspondem, conforme a Tabela 2 da Parte 3, raio de esfera rolante de ${tab2.raioEsfera} m, ` +
    `módulo de malha máximo de ${tab2.malhaLabel} m e distância máxima entre condutores de descida de ` +
    `${NEMAX_CALC_P3.tabelas.TABELA5_DIST_DESCIDA[NP]} m (Tabela 5).`
  );

  // --- Captação ---
  let txtCaptacao = "";
  if (d.metodoCaptacao === "esfera") {
    txtCaptacao = `O subsistema de captação foi posicionado pelo método da esfera rolante (5.3.2.2-b), adequado ` +
      `a qualquer geometria de cobertura (5.3.2.4). Considera-se que nenhum ponto da estrutura entra em ` +
      `contato com uma esfera fictícia de raio ${tab2.raioEsfera} m rolando ao redor e sobre a edificação, ` +
      `em qualquer direção (Anexo A.2.1). Os captores devem ser posicionados nos cantos salientes, pontas ` +
      `expostas e beiradas, prioritariamente no nível superior das fachadas (5.3.2.1).`;
  } else if (d.metodoCaptacao === "angulo") {
    const H = parseFloat(d.alturaCaptor);
    const r = H ? NEMAX_CALC_P3.calc_anguloProtecao(NP, H) : null;
    if (r && r.aplicavel) {
      txtCaptacao = `O subsistema de captação foi posicionado pelo método do ângulo de proteção (5.3.2.2-a), ` +
        `aplicável por se tratar de estrutura de geometria simples e altura compatível com o limite do método ` +
        `para o NP ${esc(NP)} (5.3.2.8). Para captor com altura H = ${esc(d.alturaCaptor)} m acima do plano de ` +
        `referência, o ângulo de proteção resultante é α ≈ ${r.value.toFixed(1)}°, gerando um cone de proteção ` +
        `com raio de base de aproximadamente ${r.raioProtecaoBase.toFixed(2)} m (Figura 1, Anexo A.1.2).`;
    } else if (r && !r.aplicavel) {
      txtCaptacao = `Foi indicado o método do ângulo de proteção, porém a altura informada (H = ${esc(d.alturaCaptor)} m) ` +
        `excede o limite de aplicação para o NP ${esc(NP)} (5.3.2.11), de modo que apenas os métodos da esfera ` +
        `rolante ou das malhas são aplicáveis a este caso e devem ser adotados em substituição.`;
    } else {
      txtCaptacao = `Foi indicado o método do ângulo de proteção; a altura do captor deve ser informada para a ` +
        `determinação do ângulo de proteção aplicável (5.3.2.8 a 5.3.2.13).`;
    }
  } else if (d.metodoCaptacao === "malha") {
    txtCaptacao = `O subsistema de captação foi posicionado pelo método das malhas (5.3.2.2-c), adequado para a ` +
      `cobertura plana da edificação. Os condutores formam módulos de, no máximo, ${tab2.malhaLabel} m ` +
      `(Tabela 2), instalados na periferia da cobertura e sobre as saliências a proteger (5.3.2.6); uma das ` +
      `dimensões do módulo pode ser ampliada em até 25 %, desde que o perímetro do módulo não seja ` +
      `aumentado (5.3.2.7). O método das malhas não é aplicável a superfícies curvas (5.3.2.5).`;
  }
  partes.push(txtCaptacao);

  // --- Descida ---
  let txtDescida = "";
  const perimetro = parseFloat(d.perimetroEstrutura);
  if (d.descidaIsolada) {
    txtDescida = `O SPDA externo foi concebido como sistema isolado da estrutura a ser protegida (5.1.2), ` +
      `condição recomendada quando os efeitos térmicos ou de explosão no ponto de impacto puderem causar ` +
      `danos à estrutura ou ao seu conteúdo. Nessa configuração, é necessário ao menos um condutor de ` +
      `descida — natural ou não natural — para cada mastro não metálico, ou em cada ponto de ancoragem de ` +
      `condutores suspensos ou de rede aérea de captação (5.4.2.1), respeitando-se a distância de segurança ` +
      `calculada entre os elementos do SPDA e a edificação.`;
  } else if (perimetro) {
    const rDesc = NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP);
    const rEsp = NEMAX_CALC_P3.calc_espacamentoReal(perimetro, rDesc.value);
    txtDescida = `O subsistema de descida foi concebido como não isolado, fixado diretamente à estrutura (5.1.2.1), ` +
      `solução adotada na maioria dos casos. Para um perímetro de ${perimetro.toFixed(2)} m e distância nominal ` +
      `entre descidas de ${rDesc.distanciaTabela} m para o NP ${esc(NP)} (Tabela 5), resultam ` +
      `${rDesc.value} condutores de descida, com espaçamento real de aproximadamente ${rEsp.value.toFixed(2)} m, ` +
      `distribuídos de forma o mais uniforme possível ao redor do perímetro, com preferência aos cantos da ` +
      `estrutura (5.4.3.1). Os condutores de descida devem constituir o caminho mais curto e direto ao solo, ` +
      `evitando-se a formação de laços (5.4.4.2).`;
  } else {
    txtDescida = `O perímetro da estrutura deve ser informado para a determinação do número mínimo de condutores ` +
      `de descida, conforme 5.4.3.1.`;
  }
  partes.push(txtDescida);

  // --- Aterramento ---
  let txtAterramento = "";
  const rho = parseFloat(d.resistividadeSolo);
  if (rho || rho === 0) {
    const rl1 = NEMAX_CALC_P3.calc_comprimentoMinEletrodo(NP, rho);
    txtAterramento = `O subsistema de aterramento foi dimensionado a partir da resistividade do solo medida, ` +
      `ρ = ${rho} Ω·m, resultando em comprimento mínimo do eletrodo de aterramento l1 = ${rl1.value.toFixed(2)} m ` +
      `(Figura 3, ${NP === "I" ? "Equação 1a" : (NP === "II" ? "Equação 1b" : "Nota 1 — independente da resistividade do solo para NP III-IV")}).`;
    const area = parseFloat(d.areaEletrodo);
    if (area) {
      const rRe = NEMAX_CALC_P3.calc_raioEquivalenteEletrodo(area);
      const rDisp = NEMAX_CALC_P3.calc_dispensaComplementacao(rRe.value, rl1.value);
      txtAterramento += ` Para a área abrangida pelo eletrodo de aterramento (${area.toFixed(2)} m²), o raio ` +
        `equivalente é re = ${rRe.value.toFixed(2)} m. Como re ${rDisp.value ? "é igual ou superior" : "é inferior"} ` +
        `a l1, a complementação do eletrodo é ${rDisp.value ? "<b>dispensada</b>" : "<b>necessária</b>"} (5.5.2.3).`;
      if (!rDisp.value) {
        const comp = NEMAX_CALC_P3.calc_eletrodoComplementar(rRe.value, rl1.value);
        txtAterramento += ` Recomenda-se a instalação, por condutor de descida, de eletrodos radiais com ` +
          `comprimento lr = ${comp.lr.value.toFixed(2)} m, ou eletrodos verticais com comprimento ` +
          `lv = ${comp.lv.value.toFixed(2)} m (5.5.2.4).`;
      }
    }
    txtAterramento += ` O subsistema de aterramento deve seguir, preferencialmente, a ordem hierárquica do ` +
      `item 5.5.2.1, priorizando a armadura de fundação com interligação horizontal, e ser enterrado a uma ` +
      `profundidade mínima de 0,5 m, posicionado a aproximadamente 1 m das paredes externas (5.5.3).`;
  } else {
    txtAterramento = `A resistividade do solo deve ser informada — preferencialmente por ensaio conforme a ` +
      `ABNT NBR 7117-1 — para a determinação do comprimento mínimo do eletrodo de aterramento (5.5.2.3).`;
  }
  partes.push(txtAterramento);

  // --- Distância de segurança ---
  let txtSeguranca = "";
  if (d.sComprimentoL) {
    const ki = NEMAX_CALC_P3.tabelas.TABELA11_KI[NP];
    const km = NEMAX_CALC_P3.tabelas.TABELA12_KM[d.meioIsolacao];
    const h = parseFloat(d.kcH), c = parseFloat(d.kcC), n = parseInt(d.kcN), l = parseFloat(d.sComprimentoL);
    let rKc = null, descCaso = "";
    if (d.casoKc === "1") { rKc = NEMAX_CALC_P3.calc_kc_umaDescida(); descCaso = "SPDA isolado com uma única descida (Figura C.3)"; }
    else if (d.casoKc === "2" && h && c) { rKc = NEMAX_CALC_P3.calc_kc_duasDescidas(h, c); descCaso = "divisão da corrente em dois condutores de descida (Figura C.4)"; }
    else if (d.casoKc === "3central" && h && c) { rKc = NEMAX_CALC_P3.calc_kc_tresDescidasCentral(h, c); descCaso = "três condutores de descida, com impacto na descida central (Figura C.5)"; }
    else if (d.casoKc === "multiplas" && h && c && n) { rKc = NEMAX_CALC_P3.calc_kc_multiplasDescidas(n, c, h); descCaso = "quatro ou mais condutores de descida (Figura C.7)"; }
    else if (d.casoKc === "tabela13" && n) { rKc = NEMAX_CALC_P3.tabela13_kc(n); descCaso = "dimensionamento simplificado por número de descidas (Tabela 13)"; }
    else if (d.casoKc === "manual" && d.kcManual) { rKc = { value: parseFloat(d.kcManual) }; descCaso = "procedimento gráfico específico do Anexo C (captação em malha, anéis intermediários ou impacto em descida de extremidade), com coeficiente kc obtido pelo responsável técnico"; }
    if (rKc && rKc.value != null) {
      const rS = NEMAX_CALC_P3.calc_distanciaSeguranca_simplificada(NP, d.meioIsolacao, rKc.value, l);
      txtSeguranca = `A distância de segurança entre os condutores do SPDA externo e as instalações metálicas, ` +
        `partes condutivas internas e sistemas internos da edificação foi verificada conforme 6.3.2, considerando ` +
        `${descCaso}, resultando em coeficiente kc = ${rKc.value.toFixed(3)}. Para o trecho de comprimento ` +
        `l = ${l.toFixed(2)} m e isolação em ${d.meioIsolacao === "ar" ? "ar" : "meio sólido"} (km = ${km}), a ` +
        `distância de segurança mínima resultante é s = ${rS.value.toFixed(3)} m. Onde essa distância não puder ` +
        `ser respeitada, deve-se promover a ligação equipotencial direta entre as partes, conforme 6.2.`;
    }
  }
  if (txtSeguranca) partes.push(txtSeguranca);

  // --- Materiais ---
  partes.push(
    `Os materiais especificados para os subsistemas de captação e descida (${esc(d.materialCaptacao)}) e para o ` +
    `eletrodo de aterramento (${esc(d.materialAterramento)}) atendem às configurações, seções transversais e ` +
    `dimensões mínimas estabelecidas, respectivamente, nas Tabelas 7 e 8 da ABNT NBR 5419-3:2026, válidas para ` +
    `todos os níveis de proteção (4.3-b).`
  );

  return partes.map((p) => `<p style="margin-bottom:10px; line-height:1.7; text-align:justify;">${p}</p>`).join("\n");
}

/* ----------------------------------------------------------
   2) LISTA DE MATERIAIS / QUANTITATIVO ESTIMADO

   Converte os dados de dimensionamento em quantidades físicas
   estimadas (comprimento de cabo, número de conectores, área de
   eletrodo etc.), cruzando com a seção mínima das Tabelas 7 e 8.
   É uma estimativa de apoio ao orçamento — não substitui o
   detalhamento de projeto executivo, e isso é declarado no
   próprio quantitativo.
   ---------------------------------------------------------- */
function calcularQuantitativoMateriais(a) {
  const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
  if (NP === "nenhum" || !a.dimensionamento) return null;
  const d = a.dimensionamento;
  const e = a.estrutura || {};
  const itens = [];

  const compE = parseFloat(e.comprimento) || 0;
  const largE = parseFloat(e.largura) || 0;
  const altE = parseFloat(e.altura) || 0;
  const perimetro = parseFloat(d.perimetroEstrutura) || (2 * (compE + largE));

  // --- Captação: comprimento de condutor estimado conforme método ---
  let compCaptacao = 0, obsCaptacao = "";
  if (d.metodoCaptacao === "malha") {
    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
    const modulo = tab2.malha;
    // estimativa: perímetro fechando os módulos + condutores internos formando a malha (grade compE x largE)
    const nLinhasH = largE > 0 ? Math.max(0, Math.floor(largE / modulo) - 1) : 0;
    const nLinhasV = compE > 0 ? Math.max(0, Math.floor(compE / modulo) - 1) : 0;
    const internos = nLinhasH * compE + nLinhasV * largE;
    compCaptacao = perimetro + internos;
    obsCaptacao = `Perímetro (${perimetro.toFixed(1)} m) + malha interna estimada para módulos de ${tab2.malhaLabel} m`;
  } else if (d.metodoCaptacao === "esfera") {
    // estimativa conservadora: condutor perimetral na borda da cobertura (captação em anel periférico)
    compCaptacao = perimetro;
    obsCaptacao = `Estimativa de condutor perimetral na borda da cobertura (verificar pontos/captores adicionais em projeto)`;
  } else if (d.metodoCaptacao === "angulo") {
    compCaptacao = perimetro;
    obsCaptacao = `Estimativa de condutor de interligação dos captores verticais na base (mastros não incluídos)`;
  }
  if (compCaptacao > 0) {
    itens.push({
      grupo: "Captação", descricao: `Condutor de captação — ${d.materialCaptacao}`,
      quantidade: compCaptacao, unidade: "m", observacao: obsCaptacao,
    });
  }

  // --- Descida: comprimento total (nº descidas × altura) ---
  if (perimetro && !d.descidaIsolada) {
    const rDesc = NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP);
    const alturaDescida = altE > 0 ? altE : 0;
    if (alturaDescida > 0) {
      itens.push({
        grupo: "Descida", descricao: `Condutor de descida — ${d.materialCaptacao}`,
        quantidade: rDesc.value * alturaDescida, unidade: "m",
        observacao: `${rDesc.value} descidas × ${alturaDescida.toFixed(1)} m (altura da edificação)`,
      });
      itens.push({
        grupo: "Descida", descricao: `Conexão de ensaio (caixa de inspeção)`,
        quantidade: rDesc.value, unidade: "un",
        observacao: `1 por condutor de descida, a ≈1,5 m do piso (5.4.6.1)`,
      });
    }
  }

  // --- Aterramento: eletrodo + complementação ---
  const rho = parseFloat(d.resistividadeSolo);
  if (rho || rho === 0) {
    const rl1 = NEMAX_CALC_P3.calc_comprimentoMinEletrodo(NP, rho);
    const eletrodoBase = perimetro || 0;
    if (eletrodoBase > 0) {
      itens.push({
        grupo: "Aterramento", descricao: `Eletrodo de aterramento em anel — ${d.materialAterramento}`,
        quantidade: eletrodoBase, unidade: "m",
        observacao: `Perímetro da edificação, enterrado a ≥0,5 m de profundidade (5.5.3.1)`,
      });
    }
    const area = parseFloat(d.areaEletrodo);
    if (area) {
      const rRe = NEMAX_CALC_P3.calc_raioEquivalenteEletrodo(area);
      const rDisp = NEMAX_CALC_P3.calc_dispensaComplementacao(rRe.value, rl1.value);
      if (!rDisp.value && perimetro) {
        const rDesc = perimetro && !d.descidaIsolada ? NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP) : null;
        const comp = NEMAX_CALC_P3.calc_eletrodoComplementar(rRe.value, rl1.value);
        if (rDesc) {
          itens.push({
            grupo: "Aterramento", descricao: `Eletrodo complementar radial — ${d.materialAterramento}`,
            quantidade: comp.lr.value * rDesc.value, unidade: "m",
            observacao: `${comp.lr.value.toFixed(2)} m × ${rDesc.value} descidas (alternativa: eletrodos verticais de ${comp.lv.value.toFixed(2)} m cada)`,
          });
        }
      }
    }
  }

  // --- Conexões / fixadores (estimativa por metro linear total) ---
  const totalLinear = itens.filter((i) => i.unidade === "m").reduce((s, i) => s + i.quantidade, 0);
  if (totalLinear > 0) {
    itens.push({
      grupo: "Fixação", descricao: `Suportes/fixadores de condutor`,
      quantidade: Math.ceil(totalLinear / 1.0), unidade: "un",
      observacao: `Estimativa a cada 1,0 m em trechos horizontais (5.6.2.2); revisar conforme trajeto real do projeto`,
    });
  }

  return itens;
}

function renderQuantitativoMateriais(a) {
  const itens = calcularQuantitativoMateriais(a);
  if (!itens || itens.length === 0) {
    return `<p style="font-size:12.5px; color:var(--gray-text);">Preencha os campos de captação, descida e aterramento para gerar o quantitativo estimado de materiais.</p>`;
  }
  const grupos = ["Captação", "Descida", "Aterramento", "Fixação"];
  let html = `<table class="hist-table" style="font-size:12.5px;">
    <thead><tr><th>Grupo</th><th>Item</th><th>Quantidade</th><th>Observação</th></tr></thead>
    <tbody>
      ${grupos.flatMap((g) => itens.filter((i) => i.grupo === g)).map((i) => `
        <tr>
          <td>${esc(i.grupo)}</td>
          <td>${esc(i.descricao)}</td>
          <td style="font-family:'Courier New',monospace; white-space:nowrap;">${i.quantidade.toFixed(i.unidade === "un" ? 0 : 2)} ${esc(i.unidade)}</td>
          <td style="font-size:11px; color:var(--gray-text);">${esc(i.observacao)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <p style="font-size:11px; color:var(--copper); margin-top:8px; line-height:1.5;">
    Quantitativo estimado a partir da geometria informada (comprimento/largura/altura da estrutura) e dos
    parâmetros de dimensionamento da ABNT NBR 5419-3:2026. Não substitui o detalhamento de projeto executivo
    (traçado real de condutores, captores adicionais em saliências, perdas e emendas); use como apoio à
    cotação preliminar, com margem de segurança adicional recomendada de 10-15 % sobre os comprimentos lineares.
  </p>`;
  return html;
}

/* ----------------------------------------------------------
   3) DESENHO ESQUEMÁTICO EM SVG

   Planta simplificada (vista superior) a partir de comprimento
   e largura da estrutura, mostrando: contorno da edificação,
   posições estimadas dos condutores de descida distribuídos no
   perímetro, captação (anel perimetral ou malha conforme o
   método escolhido), e o eletrodo de aterramento em anel.
   É um esquema de apoio à visualização, não um desenho de
   projeto executivo georreferenciado.
   ---------------------------------------------------------- */
function gerarDesenhoEsquematico(a) {
  const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
  if (NP === "nenhum" || !a.dimensionamento) return null;
  const d = a.dimensionamento;
  const e = a.estrutura || {};
  const compE = parseFloat(e.comprimento);
  const largE = parseFloat(e.largura);
  if (!compE || !largE) return null;

  const perimetro = parseFloat(d.perimetroEstrutura) || (2 * (compE + largE));
  const numDescidas = (!d.descidaIsolada && perimetro)
    ? NEMAX_CALC_P3.calc_numeroMinDescidas(perimetro, NP).value
    : 0;

  // Área de desenho (viewBox fixo), com margens assimétricas: mais espaço no topo
  // para acomodar a cota horizontal e os rótulos de descida sem sobreposição.
  const margemTopo = 70, margemBase = 60, margemLado = 60;
  const alturaUtil = 560 - margemTopo - margemBase;
  const larguraUtil = 760 - 2 * margemLado;
  const escala = Math.min(larguraUtil / compE, alturaUtil / largE);
  const w = compE * escala, h = largE * escala;
  const offX = (800 - w) / 2, offY = margemTopo + (alturaUtil - h) / 2;

  // Pontos do perímetro retangular, em sentido horário, a partir do canto superior esquerdo
  const corners = [
    [offX, offY], [offX + w, offY], [offX + w, offY + h], [offX, offY + h],
  ];
  const perimetroReal = 2 * (compE + largE);

  // Distribuir N pontos de descida uniformemente ao longo do perímetro do retângulo,
  // começando em um canto (preferência aos cantos, conforme 5.4.3.1)
  function pontoNoPerimetro(distAcumulada) {
    // percorre os 4 lados do retângulo (em metros reais) e localiza o ponto pixel correspondente
    const lados = [
      { de: corners[0], para: corners[1], comp: compE },
      { de: corners[1], para: corners[2], comp: largE },
      { de: corners[2], para: corners[3], comp: compE },
      { de: corners[3], para: corners[0], comp: largE },
    ];
    let acc = 0;
    for (const lado of lados) {
      if (distAcumulada <= acc + lado.comp || lado === lados[lados.length - 1]) {
        const t = lado.comp > 0 ? (distAcumulada - acc) / lado.comp : 0;
        const x = lado.de[0] + (lado.para[0] - lado.de[0]) * Math.min(1, Math.max(0, t));
        const y = lado.de[1] + (lado.para[1] - lado.de[1]) * Math.min(1, Math.max(0, t));
        return [x, y];
      }
      acc += lado.comp;
    }
    return corners[0];
  }

  let descidasSvg = "";
  if (numDescidas > 0) {
    const passo = perimetroReal / numDescidas;
    for (let i = 0; i < numDescidas; i++) {
      const distAcc = i * passo;
      const [x, y] = pontoNoPerimetro(distAcc);
      // Determinar em qual dos 4 lados o ponto está, para posicionar o rótulo
      // do lado de FORA do retângulo (acima/abaixo/esquerda/direita), nunca colado na borda.
      let lado;
      if (distAcc < compE) lado = "topo";
      else if (distAcc < compE + largE) lado = "direita";
      else if (distAcc < 2 * compE + largE) lado = "base";
      else lado = "esquerda";

      let tx = x, ty = y, anchor = "middle";
      const folga = 14;
      if (lado === "topo") { ty = y - folga; }
      else if (lado === "base") { ty = y + folga + 4; }
      else if (lado === "esquerda") { tx = x - folga; anchor = "end"; }
      else { tx = x + folga; anchor = "start"; }

      descidasSvg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="#b5651d" stroke="#1b2a4a" stroke-width="1.5"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="10" text-anchor="${anchor}" fill="#1b2a4a">D${i + 1}</text>`;
    }
  }

  // Captação: se método malha, desenhar grade interna; senão, só o anel perimetral em destaque
  let captacaoSvg = "";
  if (d.metodoCaptacao === "malha") {
    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
    const modulo = tab2.malha;
    const nV = Math.max(0, Math.floor(compE / modulo) - 1);
    const nH = Math.max(0, Math.floor(largE / modulo) - 1);
    for (let i = 1; i <= nV; i++) {
      const x = offX + (w * i) / (nV + 1);
      captacaoSvg += `<line x1="${x.toFixed(1)}" y1="${offY}" x2="${x.toFixed(1)}" y2="${(offY + h).toFixed(1)}" stroke="#7a8aa8" stroke-width="1" stroke-dasharray="4,3"/>`;
    }
    for (let i = 1; i <= nH; i++) {
      const y = offY + (h * i) / (nH + 1);
      captacaoSvg += `<line x1="${offX}" y1="${y.toFixed(1)}" x2="${(offX + w).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#7a8aa8" stroke-width="1" stroke-dasharray="4,3"/>`;
    }
  }

  // Eletrodo de aterramento: anel a ~1m externo ao perímetro (representação esquemática, escala não literal)
  const folgaEletrodo = Math.max(6, escala * 1.0 * 0.6); // recuo visual proporcional, não 1:1 literal
  const eletrodoSvg = `<rect x="${(offX - folgaEletrodo).toFixed(1)}" y="${(offY - folgaEletrodo).toFixed(1)}"
    width="${(w + 2 * folgaEletrodo).toFixed(1)}" height="${(h + 2 * folgaEletrodo).toFixed(1)}"
    fill="none" stroke="#2f6b4f" stroke-width="2" stroke-dasharray="2,3" rx="4"/>`;

  // Legenda: montada como lista de itens horizontais, espaçados dinamicamente
  // (sem depender de coordenadas fixas condicionais — cada item sabe sua própria largura aproximada).
  const itensLegenda = [
    { tipo: "circulo", cor: "#b5651d", texto: `Condutor de descida (${numDescidas} un.)` },
  ];
  if (d.metodoCaptacao === "malha") {
    itensLegenda.push({ tipo: "linha-tracejada", cor: "#7a8aa8", texto: "Malha de captação" });
  }
  itensLegenda.push({ tipo: "retangulo-tracejado", cor: "#2f6b4f", texto: "Eletrodo de aterramento (anel)" });

  let legendaX = 0;
  const legendaSvg = itensLegenda.map((item) => {
    let marcador = "";
    if (item.tipo === "circulo") {
      marcador = `<circle cx="${legendaX + 6}" cy="0" r="6" fill="${item.cor}" stroke="#1b2a4a" stroke-width="1.5"/>`;
    } else if (item.tipo === "linha-tracejada") {
      marcador = `<line x1="${legendaX}" y1="0" x2="${legendaX + 24}" y2="0" stroke="${item.cor}" stroke-width="1.5" stroke-dasharray="4,3"/>`;
    } else {
      marcador = `<rect x="${legendaX}" y="-6" width="22" height="11" fill="none" stroke="${item.cor}" stroke-width="2" stroke-dasharray="2,3"/>`;
    }
    const textoX = legendaX + 28;
    const texto = `<text x="${textoX}" y="4" font-size="11" fill="#1b2a4a">${esc(item.texto)}</text>`;
    legendaX = textoX + item.texto.length * 6 + 28; // avança para o próximo item, estimando largura do texto
    return marcador + texto;
  }).join("\n      ");

  // Margem extra para acomodar rótulos das descidas que agora ficam fora do retângulo
  const margemRotulo = 28;
  const viewW = 800, viewH = 560 + margemRotulo;

  const svg = `
  <svg viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:auto; background:#fbfaf7; border:1px solid #e2ddd2; border-radius:8px;">
    <!-- Eletrodo de aterramento (anel externo, esquemático) -->
    ${eletrodoSvg}
    <!-- Contorno da edificação -->
    <rect x="${offX}" y="${offY}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#fff" stroke="#1b2a4a" stroke-width="2.5"/>
    <!-- Captação -->
    ${captacaoSvg}
    <!-- Cotas -->
    <text x="${(offX + w / 2).toFixed(1)}" y="${(offY - 28).toFixed(1)}" font-size="12" text-anchor="middle" fill="#1b2a4a">${compE.toFixed(2)} m</text>
    <text x="${(offX - 14).toFixed(1)}" y="${(offY + h / 2).toFixed(1)}" font-size="12" text-anchor="middle" fill="#1b2a4a" transform="rotate(-90 ${(offX - 14).toFixed(1)} ${(offY + h / 2).toFixed(1)})">${largE.toFixed(2)} m</text>
    <!-- Descidas -->
    ${descidasSvg}
    <!-- Legenda -->
    <g transform="translate(${offX}, ${(offY + h + margemRotulo + 24).toFixed(1)})">
      ${legendaSvg}
    </g>
  </svg>`;

  return svg;
}


/* ============================================================
   VERIFICAÇÃO DE CONSISTÊNCIA — MÓDULO 8 (DIMENSIONAMENTO SPDA)

   Cruza dados entre os módulos do wizard e dentro do próprio
   dimensionamento físico, sinalizando divergências sem bloquear
   o fluxo — a decisão final é sempre do responsável técnico.

   Cada item retornado tem:
   { nivel: "vermelho" | "amarelo", titulo, mensagem }

   "vermelho": a divergência compromete diretamente a validade
   do cálculo de distância de segurança ou do dimensionamento
   físico (ex.: caso de kc incompatível com o número real de
   descidas calculado).

   "amarelo": divergência geométrica ou de digitação que merece
   atenção, mas não necessariamente invalida o resultado (ex.:
   perímetro informado manualmente diferente do perímetro
   retangular implícito por comprimento × largura).
   ============================================================ */

/* ============================================================
   evitarTitulosOrfaos — corrige título de seção do relatório PDF
   ficando sozinho no fim de uma página, com seu conteúdo empurrado
   para a próxima. Ver comentário completo dentro da função.
   ============================================================ */
function evitarTitulosOrfaos(container, alturaMinimaPx) {
  const ALTURA_MINIMA = alturaMinimaPx || 180;
  const LIMITE_ELEMENTOS = 8; // segurança contra loop, mesmo que altura nunca atinja o limiar
  const doc = container.ownerDocument;

  const h2s = Array.from(container.querySelectorAll(".report-h2"));
  h2s.forEach((h2) => {
    const parent = h2.parentNode;
    if (!parent) return;

    const wrapper = doc.createElement("div");
    wrapper.className = "report-h2-group";
    wrapper.style.breakInside = "avoid";
    wrapper.style.pageBreakInside = "avoid";

    parent.insertBefore(wrapper, h2);
    wrapper.appendChild(h2);

    let alturaAcumulada = h2.offsetHeight || 0;
    let elementosMovidos = 0;
    let proximo = wrapper.nextSibling;

    while (proximo && alturaAcumulada < ALTURA_MINIMA && elementosMovidos < LIMITE_ELEMENTOS) {
      const atual = proximo;
      proximo = proximo.nextSibling;

      // Não "rouba" conteúdo de uma próxima seção (próximo título encontrado)
      if (atual.nodeType === 1 && atual.classList && atual.classList.contains("report-h2")) break;

      const altura = atual.nodeType === 1 ? (atual.offsetHeight || 0) : 0;
      wrapper.appendChild(atual);
      alturaAcumulada += altura;
      elementosMovidos++;
    }
  });

  return h2s.length;
}

/* ============================================================
   VERIFICAÇÃO DE CONSISTÊNCIA — Módulo 2 (Estrutura, NBR 5419-2)

   Auto-validação interna ao próprio módulo (ambos os campos
   cruzados — "materiaisExplosivos" e "providenciasIncendio" — já
   estão disponíveis na primeira passada, sem depender de outro
   módulo do wizard).

   Cobre a regra C.3.4: "Em estruturas com risco de explosão, rp
   deve ser considerado igual a 1 para todos os casos." Essa é uma
   regra absoluta (sem exceção condicionada, ao contrário de 5.4.7,
   que vive em verificarConsistenciaProtecoes por depender do NP
   definido no Módulo 6).
   ============================================================ */
function verificarConsistenciaEstrutura(a) {
  const avisos = [];
  const e = a.estrutura;
  if (!e) return avisos;

  // C.3.4 — rp deve ser exatamente 1 ("Nenhuma providência ou risco
  // de explosão") quando a estrutura tem risco de explosão. A própria
  // Tabela C.4 já modela isso: o rótulo da linha rp=1 inclui "ou risco
  // de explosão" — qualquer outro valor (0,5 ou 0,2) viola a regra.
  if (e.materiaisExplosivos && e.providenciasIncendio !== 1) {
    avisos.push({
      nivel: "vermelho",
      titulo: "Providências contra incêndio incompatíveis com risco de explosão",
      mensagem: `A estrutura foi marcada como tendo "Materiais ou atmosfera explosiva", mas o fator r_p (providências contra incêndio, Tabela C.4) está configurado para um valor diferente de 1. Conforme C.3.4, em estruturas com risco de explosão, r_p deve ser considerado igual a 1 para todos os casos, independentemente das providências de combate a incêndio existentes. Ajuste o campo "Providências contra incêndio" para "Nenhuma providência (ou risco de explosão)".`,
    });
  }

  // Verificação de alinhamento entre o flag textual (materiaisExplosivos)
  // e o valor numérico de r_f (Tabela C.5) — os três primeiros valores da
  // tabela (1, 0,1 e 0,001) correspondem às zonas explosivas 0/20, 1/21 e
  // 2/22; qualquer outro valor de r_f sugere que o campo de risco de
  // incêndio/explosão não foi ajustado para refletir a marcação do checkbox.
  const valoresExplosaoRF = [1, 0.1, 0.001];
  if (e.materiaisExplosivos && !valoresExplosaoRF.includes(e.riscoIncendio)) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Risco de incêndio/explosão (r_f) não reflete a marcação de atmosfera explosiva",
      mensagem: `A estrutura foi marcada como tendo "Materiais ou atmosfera explosiva", mas o campo "Risco de incêndio/explosão" (r_f, Tabela C.5) não está configurado para nenhuma das zonas explosivas (0/20, 1/21 ou 2/22). Revise a seleção para refletir corretamente a classificação da área conforme ABNT NBR IEC 60079-10-1/10-2.`,
    });
  }

  return avisos;
}

function renderPainelConsistenciaEstrutura(a) {
  const avisos = verificarConsistenciaEstrutura(a);
  if (avisos.length === 0) return "";

  const vermelhos = avisos.filter((x) => x.nivel === "vermelho");
  const amarelos = avisos.filter((x) => x.nivel === "amarelo");

  function bloco(item) {
    const cor = item.nivel === "vermelho" ? "#f87171" : "#fb923c";
    const bg = item.nivel === "vermelho" ? "rgba(248,113,113,0.14)" : "rgba(251,146,60,0.14)";
    return `<div style="border-left:4px solid ${cor}; background:${bg}; padding:10px 14px; margin-bottom:8px; border-radius:4px;">
      <div style="font-weight:700; font-size:12.5px; color:${cor};">${item.nivel === "vermelho" ? "⚠ " : "ℹ "}${esc(item.titulo)}</div>
      <div style="font-size:12px; color:var(--gray-text); margin-top:3px; line-height:1.5;">${esc(item.mensagem)}</div>
    </div>`;
  }

  return `
    <div class="subsection" style="border-color:${vermelhos.length ? "#f87171" : "#fb923c"};">
      <div class="subsection-title">Verificação de consistência — Estrutura (${avisos.length} item${avisos.length > 1 ? "ns" : ""})</div>
      ${vermelhos.map(bloco).join("")}
      ${amarelos.map(bloco).join("")}
      <p style="font-size:10.5px; color:var(--gray-text); margin-top:6px;">Verificação interna aos dados deste módulo (ABNT NBR 5419-2:2026, C.3.4); não substitui a análise técnica do responsável.</p>
    </div>
  `;
}

/* ============================================================
   VERIFICAÇÃO DE CONSISTÊNCIA — Módulo 6 (Proteções, NBR 5419-2)
   × Módulo 4 (Linhas) e Módulo 5 (Fontes de dano)

   Cobre dois cruzamentos com módulos que sempre vêm ANTES do
   Módulo 6 no wizard (ordem 4 → 5 → 6), garantindo que os dados
   cruzados já estejam preenchidos na primeira passada:
   1) Premissa de blindagem/interligação ao BEP assumida em
      "Condição da linha elétrica" (Tabela B.4) vs. o campo
      "Blindada?" cadastrado linha a linha no Módulo 4.
   4) Fontes de dano S3/S4 marcadas como relevantes no Módulo 5
      sem nenhuma linha cadastrada no Módulo 4 — os componentes
      de risco R_U/R_V/R_W/R_Z dependem inteiramente de N_L/N_I,
      que são somados a partir das linhas cadastradas; sem
      nenhuma linha, esses componentes ficam silenciosamente
      zerados mesmo com S3/S4 ativas.
   5) NP do SPDA inferior a II (ou nenhum) em estrutura com risco
      de explosão (Módulo 2) — recomendação de 5.4.7, não regra
      absoluta: a norma permite NP I sempre, e NP III/IV mediante
      justificativa técnica aceita pela autoridade competente.

   (O cruzamento "nº de linhas × nº de pontos de DPS" vive em
   verificarConsistenciaMPS, Módulo 9, que vem DEPOIS do Módulo 6
   no wizard — colocá-lo aqui geraria falso aviso antes mesmo do
   usuário chegar ao Módulo 9 na primeira passada.)
   ============================================================ */
function verificarConsistenciaProtecoes(a) {
  const avisos = [];
  const p = a.protecoes;
  if (!p) return avisos;

  const linhas = a.linhas || { energia: [], sinal: [] };
  const todasLinhas = [...(linhas.energia || []), ...(linhas.sinal || [])];
  const condLinha = NEMAX_CALC.tabelas.B4_CLD_CLI[p.condicaoLinha];

  // --- 1) Premissa de blindagem (Tabela B.4) vs. campo "Blindada?" no Módulo 4 ---
  if (condLinha) {
    const premissaBlindadaInterligada = p.condicaoLinha === 5; // "blindada — interligada ao BEP" (cli=0, melhor caso)
    const premissaBlindadaNaoInterligada = p.condicaoLinha === 3 || p.condicaoLinha === 4; // blindada, sem interligação (cli>0)
    const algumaLinhaBlindada = todasLinhas.some((ln) => ln.blindada === "sim");
    const algumaLinhaCadastrada = todasLinhas.length > 0;

    if ((premissaBlindadaInterligada || premissaBlindadaNaoInterligada) && algumaLinhaCadastrada && !algumaLinhaBlindada) {
      avisos.push({
        nivel: premissaBlindadaInterligada ? "vermelho" : "amarelo",
        titulo: "Premissa de blindagem de linha não confirmada no cadastro físico",
        mensagem: `A condição da linha elétrica assumida no risco é "${condLinha.label}" (C_LD=${condLinha.cld}, C_LI=${condLinha.cli}), mas nenhuma das linhas cadastradas no Módulo 4 está marcada como "Blindada: Sim". Se a instalação real não tiver blindagem, o risco calculado está subestimado — revise a premissa no Módulo 6 ou corrija o cadastro das linhas no Módulo 4.`,
      });
    }
    if (p.condicaoLinha <= 1 && algumaLinhaCadastrada && algumaLinhaBlindada) {
      avisos.push({
        nivel: "amarelo",
        titulo: "Linha blindada cadastrada, mas premissa do risco assume linha não blindada",
        mensagem: `Ao menos uma linha cadastrada no Módulo 4 está marcada como "Blindada: Sim", mas a condição assumida no Módulo 6 é "${condLinha.label}" (sem blindagem). Se a blindagem estiver corretamente interligada ao BEP, atualizar a premissa no Módulo 6 reduziria C_LI e o risco calculado de forma mais realista.`,
      });
    }
  }

  // --- 4) S3/S4 ativas (Módulo 5) sem nenhuma linha cadastrada (Módulo 4) ---
  const f = a.fontesDano || {};
  if ((f.S3 || f.S4) && todasLinhas.length === 0) {
    avisos.push({
      nivel: "vermelho",
      titulo: "Fonte de dano em linha marcada sem nenhuma linha cadastrada",
      mensagem: `${f.S3 && f.S4 ? "As fontes de dano S3 (descarga na linha) e S4 (descarga próxima da linha)" : f.S3 ? "A fonte de dano S3 (descarga na linha)" : "A fonte de dano S4 (descarga próxima da linha)"} ${f.S3 && f.S4 ? "estão marcadas" : "está marcada"} como relevante(s) no Módulo 5, mas nenhuma linha foi cadastrada no Módulo 4. Os componentes de risco R_U/R_V/R_W/R_Z dependem do número de eventos perigosos calculado a partir das linhas cadastradas (N_L, N_I) — sem nenhuma linha, esses componentes são calculados como zero, mesmo com a fonte de dano marcada como relevante. Cadastre as linhas reais da estrutura no Módulo 4, ou desmarque S3/S4 se não houver linhas conectadas.`,
    });
  }

  // --- 5) NP do SPDA abaixo de II (ou nenhum) em estrutura com risco de
  // explosão (Módulo 2) — recomendação de 5.4.7, não regra absoluta: a
  // norma permite NP I em todos os casos, e NP III/IV mediante
  // justificativa técnica aceita pela autoridade competente, por isso o
  // aviso é amarelo (informativo), não vermelho.
  const e = a.estrutura || {};
  if (e.materiaisExplosivos && (p.npSpda === "III" || p.npSpda === "IV" || p.npSpda === "nenhum")) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Nível de proteção abaixo do recomendado para estrutura com risco de explosão",
      mensagem: `A estrutura foi marcada como tendo risco de explosão (Módulo 2). Conforme 5.4.7, quando a proteção contra descargas atmosféricas for exigida pelas autoridades competentes para estruturas com risco de explosão, deve ser adotado no mínimo um SPDA nível II. NP I é permitido em todos os casos; NP III ou IV exigem justificativa técnica aceita pela autoridade competente (baixa frequência de atividade atmosférica ou baixa sensibilidade dos conteúdos). NP atual: ${esc(p.npSpda)}.`,
    });
  }

  return avisos;
}

function renderPainelConsistenciaProtecoes(a) {
  const avisos = verificarConsistenciaProtecoes(a);
  if (avisos.length === 0) return "";

  const vermelhos = avisos.filter((x) => x.nivel === "vermelho");
  const amarelos = avisos.filter((x) => x.nivel === "amarelo");

  function bloco(item) {
    const cor = item.nivel === "vermelho" ? "#f87171" : "#fb923c";
    const bg = item.nivel === "vermelho" ? "rgba(248,113,113,0.14)" : "rgba(251,146,60,0.14)";
    return `<div style="border-left:4px solid ${cor}; background:${bg}; padding:10px 14px; margin-bottom:8px; border-radius:4px;">
      <div style="font-weight:700; font-size:12.5px; color:${cor};">${item.nivel === "vermelho" ? "⚠ " : "ℹ "}${esc(item.titulo)}</div>
      <div style="font-size:12px; color:var(--gray-text); margin-top:3px; line-height:1.5;">${esc(item.mensagem)}</div>
    </div>`;
  }

  return `
    <div class="subsection" style="border-color:${vermelhos.length ? "#f87171" : "#fb923c"};">
      <div class="subsection-title">Verificação de consistência — Proteções × Estrutura, Linhas, Fontes de Dano e MPS (${avisos.length} item${avisos.length > 1 ? "ns" : ""})</div>
      ${vermelhos.map(bloco).join("")}
      ${amarelos.map(bloco).join("")}
      <p style="font-size:10.5px; color:var(--gray-text); margin-top:6px;">Cruza dados entre este módulo e os Módulos 2 (Estrutura), 4 (Linhas), 5 (Fontes de dano) e 9 (MPS); não substitui a análise técnica do responsável.</p>
    </div>
  `;
}

function verificarConsistencia(a) {
  const avisos = [];
  const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
  if (NP === "nenhum" || !a.dimensionamento) return avisos;

  const d = a.dimensionamento;
  const e = a.estrutura || {};

  const perim = parseFloat(d.perimetroEstrutura);
  const compE = parseFloat(e.comprimento);
  const largE = parseFloat(e.largura);
  const altE = parseFloat(e.altura);
  const alturaCaptor = parseFloat(d.alturaCaptor);

  // --- 1) Perímetro informado vs. perímetro retangular implícito (amarelo) ---
  if (perim && compE && largE) {
    const perimRetangular = 2 * (compE + largE);
    const diff = Math.abs(perim - perimRetangular);
    if (diff > 0.5) { // tolerância de meio metro para arredondamentos
      avisos.push({
        nivel: "amarelo",
        titulo: "Perímetro divergente da geometria retangular",
        mensagem: `O perímetro informado (${perim.toFixed(2)} m) difere do perímetro retangular implícito por comprimento × largura da estrutura (${compE} × ${largE} m = ${perimRetangular.toFixed(2)} m). Isso é esperado em estruturas não retangulares (formato em L, anexos, recuos); confirme que o valor informado reflete a geometria real.`,
      });
    }
  }

  // --- 2) Altura do captor (método ângulo) vs. altura da estrutura (amarelo) ---
  if (d.metodoCaptacao === "angulo" && alturaCaptor && altE) {
    const diff = Math.abs(alturaCaptor - altE);
    if (diff > 0.3) {
      avisos.push({
        nivel: "amarelo",
        titulo: "Altura do captor divergente da altura da estrutura",
        mensagem: `A altura informada para o captor (H = ${alturaCaptor} m) difere da altura da estrutura cadastrada no Módulo 2 (${altE} m). Confirme se H representa corretamente a altura do captor acima do plano de referência (5.3.2.12) — pode ser intencional (captor sobre platibanda, mastro elevado etc.).`,
      });
    }
  }

  // --- 3) Caso de kc incompatível com número de descidas calculado (VERMELHO) ---
  const numDescCalc = (perim && !d.descidaIsolada)
    ? NEMAX_CALC_P3.calc_numeroMinDescidas(perim, NP).value
    : null;

  if (numDescCalc != null) {
    if (d.casoKc === "1" && numDescCalc !== 1) {
      avisos.push({
        nivel: "vermelho",
        titulo: "Caso de kc incompatível com o número de descidas",
        mensagem: `O caso selecionado para kc é "1 descida — SPDA isolado" (kc = 1, Fig. C.3), mas o subsistema de descida calculou ${numDescCalc} condutores de descida para o perímetro informado. O kc = 1 só é válido para SPDA isolado com uma única descida (C.3.1). Revise o caso de kc selecionado.`,
      });
    }
    if (d.casoKc === "2" && numDescCalc !== 2) {
      avisos.push({
        nivel: "vermelho",
        titulo: "Caso de kc incompatível com o número de descidas",
        mensagem: `O caso selecionado para kc é "2 descidas" (Fig. C.4), mas o subsistema de descida calculou ${numDescCalc} condutores de descida. Revise o caso de kc selecionado para refletir o número real de descidas do projeto.`,
      });
    }
    if (d.casoKc === "3central" && numDescCalc !== 3) {
      avisos.push({
        nivel: "vermelho",
        titulo: "Caso de kc incompatível com o número de descidas",
        mensagem: `O caso selecionado para kc é "3 descidas — impacto na central" (Fig. C.5), mas o subsistema de descida calculou ${numDescCalc} condutores de descida. Revise o caso de kc selecionado.`,
      });
    }
    if ((d.casoKc === "multiplas") && numDescCalc < 4) {
      avisos.push({
        nivel: "vermelho",
        titulo: "Caso de kc incompatível com o número de descidas",
        mensagem: `O caso selecionado ("4 ou mais descidas", Fig. C.7) exige n ≥ 4, mas o subsistema de descida calculou apenas ${numDescCalc} condutores de descida para o perímetro informado. A fórmula da Figura C.7 não é válida abaixo de 4 descidas (C.3.4.1) — selecione o caso correspondente a ${numDescCalc} descida(s).`,
      });
    }
    // kcN divergente do calculado (vermelho — afeta diretamente o valor de kc usado no cálculo de s)
    if ((d.casoKc === "multiplas" || d.casoKc === "tabela13") && d.kcN) {
      const kcNInformado = parseInt(d.kcN);
      if (kcNInformado && kcNInformado !== numDescCalc) {
        avisos.push({
          nivel: "vermelho",
          titulo: "Número de descidas (n) divergente entre os blocos",
          mensagem: `O campo "n" usado no cálculo de kc está preenchido com ${kcNInformado}, mas o subsistema de descida calculou ${numDescCalc} condutores de descida para o perímetro e NP informados. Como kc depende diretamente de n, essa divergência altera o valor da distância de segurança calculada. Atualize o campo "n" para ${numDescCalc}, ou justifique tecnicamente o valor divergente.`,
        });
      }
    }
  }

  // --- 4) SPDA isolado, mas caso de kc pressupõe múltiplas descidas fixas (amarelo) ---
  if (d.descidaIsolada && (d.casoKc === "2" || d.casoKc === "3central" || d.casoKc === "multiplas" || d.casoKc === "tabela13")) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Caso de kc pressupõe SPDA não isolado",
      mensagem: `O SPDA foi configurado como isolado da estrutura (5.4.2), mas o caso de kc selecionado pressupõe descidas fixadas à estrutura com divisão de corrente entre condutores (Anexo C, C.3.2 a C.3.4). Para SPDA isolado com uma única descida, o caso correto é "1 descida — SPDA isolado" (kc = 1, Fig. C.3); para múltiplos mastros isolados, avalie se o caso C.3.x se aplica ao arranjo real.`,
    });
  }

  // --- 5) Método ângulo de proteção além do limite de altura do NP (vermelho, já existe aviso pontual, reforça aqui) ---
  if (d.metodoCaptacao === "angulo" && alturaCaptor) {
    const r = NEMAX_CALC_P3.calc_anguloProtecao(NP, alturaCaptor);
    if (!r.aplicavel) {
      avisos.push({
        nivel: "vermelho",
        titulo: "Método do ângulo de proteção não aplicável",
        mensagem: `Para H = ${alturaCaptor} m e NP ${NP}, o método do ângulo de proteção não é aplicável (5.3.2.11) — a altura excede o limite da Figura 1 para este nível de proteção. Apenas os métodos da esfera rolante ou das malhas podem ser usados neste caso.`,
      });
    }
  }

  // --- 6) Eletrodo de aterramento: área não informada mas resistividade sim (amarelo) ---
  if (d.resistividadeSolo && !d.areaEletrodo) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Verificação de complementação do eletrodo pendente",
      mensagem: `O comprimento mínimo do eletrodo (l1) foi calculado, mas a área abrangida pelo eletrodo de aterramento não foi informada — a verificação de necessidade de complementação (5.5.2.3) não pôde ser realizada.`,
    });
  }

  return avisos;
}

function renderPainelConsistencia(a) {
  const avisos = verificarConsistencia(a);
  if (avisos.length === 0) return "";

  const vermelhos = avisos.filter((x) => x.nivel === "vermelho");
  const amarelos = avisos.filter((x) => x.nivel === "amarelo");

  function bloco(item) {
    const cor = item.nivel === "vermelho" ? "#f87171" : "#fb923c";
    const bg = item.nivel === "vermelho" ? "rgba(248,113,113,0.14)" : "rgba(251,146,60,0.14)";
    return `<div style="border-left:4px solid ${cor}; background:${bg}; padding:10px 14px; margin-bottom:8px; border-radius:4px;">
      <div style="font-weight:700; font-size:12.5px; color:${cor};">${item.nivel === "vermelho" ? "⚠ " : "ℹ "}${esc(item.titulo)}</div>
      <div style="font-size:12px; color:var(--gray-text); margin-top:3px; line-height:1.5;">${esc(item.mensagem)}</div>
    </div>`;
  }

  return `
    <div class="subsection" style="border-color:${vermelhos.length ? "#f87171" : "#fb923c"};">
      <div class="subsection-title">Verificação de consistência (${avisos.length} item${avisos.length > 1 ? "ns" : ""})</div>
      ${vermelhos.map(bloco).join("")}
      ${amarelos.map(bloco).join("")}
      <p style="font-size:10.5px; color:var(--gray-text); margin-top:6px;">Esta verificação cruza dados entre os módulos do wizard automaticamente; não substitui a análise técnica do responsável. Decisões finais permanecem a critério do engenheiro responsável.</p>
    </div>
  `;
}


/* ============================================================
   MÓDULO 9 — MEDIDAS DE PROTEÇÃO CONTRA SURTOS (MPS)
   Norma: ABNT NBR 5419-4:2026
   ENTREGA 1: Zoneamento ZPR + Anexo C (DPS coordenado) + Tabela 1
   ============================================================ */

/* ENTREGA 2: Anexo A.4 (campo magnético / blindagem em forma de grade)
   + Anexo A.5 (tensões e correntes induzidas em laços). */

function novoEstadoMPS() {
  return {
    // Zoneamento ZPR (orientação textual)
    zonasIdentificadas: [], // array de { zpr: "0A"|"0B"|"1"|"2+", descricao: "" }

    // Pontos de instalação de DPS coordenado (Anexo C)
    pontosDPS: [],

    // Avaliações de campo magnético / tensões e correntes induzidas (Anexo A.4/A.5)
    avaliacoesCampo: [],

    // Interfaces isolantes (3.74) — medida alternativa ao DPS coordenado na
    // fronteira de uma ZPR, sem motor de cálculo associado (dispositivo
    // qualitativo: bloqueia surtos conduzidos, não é dimensionado por Up/f).
    interfacesIsolantes: [],
  };
}

function novaInterfaceIsolante() {
  return {
    nome: "",
    servico: "energia", // energia | sinal
    descricao: "",
  };
}

function novaAvaliacaoCampo() {
  return {
    nome: "",
    cenario: "direto", // direto | proximo
    materialBlindagem: "cobre", // cobre | aluminio | aco
    wm: "", // largura da malha (m)
    malhaEquipotencial: false, // soma 6dB ao SF (5.2/5.3)
    rc: "", // raio do condutor da blindagem (m) — só para aço a 25kHz
    freq25kHz: true, // só relevante para aço: 25kHz (1ª comp. positiva) vs 1MHz/250kHz

    // Cenário "direto" — geometria do ponto de avaliação dentro da ZPR
    dw: "", // distância mais curta até a parede (m)
    dr: "", // distância mais curta até a cobertura (m)
    kh: "0.01", // fator de configuração (padrão 0,01)

    // Cenário "próximo" — geometria da estrutura para sa
    alturaEstrutura: "",
    comprimentoEstrutura: "",
    raioEsferaRolante: "", // se vazio, tenta reaproveitar do NP/Tabela 4 (Parte 1)
    Sa: "", // se preenchido manualmente, sobrepõe o cálculo de sa

    // Laço para tensão/corrente induzida (Anexo A.5)
    calcularInducao: false,
    lacoL: "", // comprimento do laço (m)
    lacoB: "", // largura do laço (m)
    lacoRc: "0.005", // raio do condutor do laço (m), padrão 5mm
    dlw: "", // distância do laço à parede da blindagem (m) — cenário direto
    dlr: "", // distância média do laço ao teto da blindagem (m) — cenário direto
  };
}

function novoPontoDPS() {
  return {
    nome: "",
    servico: "energia", // energia | sinal
    tipoDPS: "limitador", // limitador | comutador
    faixaFaseTensao: "220 a 254",
    categoriaProduto: "III",
    uwManual: "", // se preenchido, sobrepõe a Tabela A.1
    up: "",
    deltaUModo: "estimado", // estimado | manual
    deltaUCorrenteKA: "",
    deltaUComprimentoM: "",
    deltaUManual: "",
    comprimentoCircuitoM: "",
    sistemaCritico: false,
  };
}

const M_MPS = (function () {
  function render(a) {
    if (!a.mps) a.mps = novoEstadoMPS();
    if (!a.mps.avaliacoesCampo) a.mps.avaliacoesCampo = []; // retrocompat: análises salvas na Entrega 1
    if (!a.mps.interfacesIsolantes) a.mps.interfacesIsolantes = []; // retrocompat: análises salvas na Entrega 2
    const m = a.mps;
    return `
      <p style="font-size:12.5px; color:var(--gray-text); margin-bottom:18px; line-height:1.6;">
        Este módulo trata das <b>Medidas de Proteção contra Surtos (MPS)</b> causados por LEMP
        (ABNT NBR 5419-4:2026), distintas do SPDA físico (Módulo 8, NBR 5419-3) e do tratamento
        probabilístico de DPS já usado na análise de risco (Módulo 6, NBR 5419-2).
        ${NEMAX_CALC_P4.TERMINOLOGIA.NOTA_LIMITE_SPDA3}
      </p>

      <div class="subsection">
        <div class="subsection-title">Zoneamento ZPR (§4.3)</div>
        <div id="zonas-mps">${m.zonasIdentificadas.map((z, i) => zonaBlock(z, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_MPS.addZona()">＋ Adicionar zona</button>
        ${renderReferenciaZPR()}
      </div>

      <div class="subsection">
        <div class="subsection-title">Sistema coordenado de DPS — seleção e verificação (Anexo C)</div>
        <div id="pontos-dps">${m.pontosDPS.map((p, i) => pontoDPSBlock(p, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_MPS.addPontoDPS()">＋ Adicionar ponto de DPS</button>
      </div>

      <div class="subsection">
        <div class="subsection-title">Interfaces isolantes (3.74) — medida alternativa ao DPS coordenado</div>
        <p style="font-size:11.5px; color:var(--gray-text); margin-bottom:10px;">
          Dispositivos capazes de bloquear surtos conduzidos nas linhas que adentram a ZPR (3.74).
          Não possuem motor de cálculo associado (Up/f) — são uma alternativa qualitativa ao sistema
          coordenado de DPS, conforme C.2.
        </p>
        <div id="interfaces-isolantes">${m.interfacesIsolantes.map((ii, i) => interfaceIsolanteBlock(ii, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_MPS.addInterfaceIsolante()">＋ Adicionar interface isolante</button>
      </div>

      <div class="subsection">
        <div class="subsection-title">Campo magnético, blindagem e tensões/correntes induzidas (Anexo A.4 e A.5)</div>
        ${renderAvisoKcReaproveitado(a)}
        <div id="avaliacoes-campo">${m.avaliacoesCampo.map((c, i) => avaliacaoCampoBlock(a, c, i)).join("")}</div>
        <button class="btn btn-secondary" onclick="M_MPS.addAvaliacaoCampo()">＋ Adicionar avaliação de campo</button>
      </div>

      ${renderPainelConsistenciaMPS(a)}
    `;
  }

  function renderReferenciaZPR() {
    const zonas = NEMAX_CALC_P4.listarZPR();
    return `
      <table class="hist-table" style="font-size:12px; margin-top:10px;">
        <thead><tr><th>Zona</th><th>Tipo</th><th>Ameaça</th></tr></thead>
        <tbody>
          ${zonas.map((z) => `<tr><td><b>${esc(z.label)}</b></td><td>${esc(z.tipo)}</td><td>${esc(z.ameaca)}</td></tr>`).join("")}
        </tbody>
      </table>
      <p style="font-size:10.5px; color:var(--gray-text); margin-top:6px;">ABNT NBR 5419-4:2026, 4.3.1.</p>
    `;
  }

  function zonaBlock(z, i) {
    const zonas = NEMAX_CALC_P4.listarZPR();
    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_MPS.removerZona(${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Classificação ZPR</label>
            <select class="zona-zpr" data-i="${i}">
              ${zonas.map((zc) => `<option value="${zc.id}" ${z.zpr === zc.id ? "selected" : ""}>${esc(zc.label)}</option>`).join("")}
            </select>
          </div>
          <div class="field span-2"><label>Descrição / ambiente abrangido</label>
            <input type="text" class="zona-descricao" data-i="${i}" value="${esc(z.descricao || "")}" placeholder="ex: sala de servidores, CPD, quadro de automação">
          </div>
        </div>
      </div>
    `;
  }

  function pontoDPSBlock(p, i) {
    const faixas = NEMAX_CALC_P4.tabelas.TABELA_A1_UW.map((l) => l.faixaFase);
    const categorias = NEMAX_CALC_P4.tabelas.CATEGORIAS_PRODUTO_UW;

    // Pré-visualização ao vivo (apenas leitura — recalculada de fato em coletar/verificação)
    let preview = "";
    if (p.up) {
      const r = calcularPontoDPS(p);
      if (r) preview = renderPreviewDPS(r);
    }

    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_MPS.removerPontoDPS(${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Identificação do ponto</label>
            <input type="text" class="dps-nome" data-i="${i}" value="${esc(p.nome || "")}" placeholder="ex: QGBT — entrada de energia">
          </div>
          <div class="field"><label>Serviço</label>
            <select class="dps-servico" data-i="${i}">
              <option value="energia" ${p.servico === "energia" ? "selected" : ""}>Energia</option>
              <option value="sinal" ${p.servico === "sinal" ? "selected" : ""}>Sinal</option>
            </select>
          </div>
          <div class="field"><label>Tipo de DPS (C.2.1.3)</label>
            <select class="dps-tipo" data-i="${i}">
              <option value="limitador" ${p.tipoDPS === "limitador" ? "selected" : ""}>Limitador de tensão — Up/f = Up + ΔU</option>
              <option value="comutador" ${p.tipoDPS === "comutador" ? "selected" : ""}>Comutador de tensão — Up/f = Máx.(Up, ΔU)</option>
            </select>
          </div>

          <div class="field"><label>Faixa de tensão nominal da instalação (Tabela A.1)</label>
            <select class="dps-faixa" data-i="${i}">
              ${faixas.map((f) => `<option value="${esc(f)}" ${p.faixaFaseTensao === f ? "selected" : ""}>${esc(f)} V (fase)</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Categoria do produto a proteger (Tabela A.1)</label>
            <select class="dps-categoria" data-i="${i}">
              ${Object.keys(categorias).map((k) => `<option value="${k}" ${p.categoriaProduto === k ? "selected" : ""}>${esc(categorias[k].label)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Uw manual (kV) — opcional, sobrepõe Tabela A.1</label>
            <input type="number" step="0.1" class="dps-uw-manual" data-i="${i}" value="${esc(p.uwManual || "")}" placeholder="deixe em branco para usar a Tabela A.1">
          </div>

          <div class="field"><label>Up do DPS (kV) — dado do fabricante</label>
            <input type="number" step="0.01" class="dps-up" data-i="${i}" value="${esc(p.up || "")}">
          </div>
          <div class="field"><label>Origem de ΔU</label>
            <select class="dps-deltau-modo" data-i="${i}">
              <option value="estimado" ${p.deltaUModo === "estimado" ? "selected" : ""}>Estimar (0,1 kV/kA/m — C.2.1.4, NOTA)</option>
              <option value="manual" ${p.deltaUModo === "manual" ? "selected" : ""}>Informar manualmente (dado de fabricante/projeto)</option>
            </select>
          </div>
          <div class="field"></div>

          ${p.deltaUModo === "manual" ? `
          <div class="field"><label>ΔU manual (kV)</label>
            <input type="number" step="0.01" class="dps-deltau-manual" data-i="${i}" value="${esc(p.deltaUManual || "")}">
          </div>
          <div class="field"></div><div class="field"></div>
          ` : `
          <div class="field"><label>Corrente parcial estimada no trecho (kA)</label>
            <input type="number" step="0.1" class="dps-deltau-corrente" data-i="${i}" value="${esc(p.deltaUCorrenteKA || "")}">
          </div>
          <div class="field"><label>Comprimento dos condutores de ligação do DPS (m)</label>
            <input type="number" step="0.1" class="dps-deltau-comprimento" data-i="${i}" value="${esc(p.deltaUComprimentoM || "")}">
          </div>
          <div class="field"></div>
          `}

          <div class="field"><label>Comprimento do circuito DPS → equipamento (m)</label>
            <input type="number" step="0.1" class="dps-comp-circuito" data-i="${i}" value="${esc(p.comprimentoCircuitoM || "")}">
            <span class="hint">0 ou em branco = desprezável (C.2.1.9-a)</span>
          </div>
          <div class="field"><label>Sistema interno crítico? (NBR 5419-2)</label>
            <select class="dps-critico" data-i="${i}">
              <option value="nao" ${!p.sistemaCritico ? "selected" : ""}>Não</option>
              <option value="sim" ${p.sistemaCritico ? "selected" : ""}>Sim</option>
            </select>
          </div>
          <div class="field"></div>
        </div>
        ${preview}
      </div>
    `;
  }

  function renderPreviewDPS(r) {
    const cor = r.protecao.protegido ? "var(--ok)" : "var(--fail)";
    const bg = r.protecao.protegido ? "var(--ok-bg)" : "var(--fail-bg)";
    return `
      <div style="margin-top:14px; padding:12px 16px; border-radius:6px; background:${bg}; border:1px solid ${cor};">
        <div style="font-weight:700; font-size:13px; color:${cor};">
          ${r.protecao.protegido ? "✓ PROTEGIDO" : "⚠ NÃO PROTEGIDO"} — Up/f = ${r.upF.value.toFixed(3)} kV · Uw = ${r.uw.toFixed(2)} kV
          ${r.protecao.condicaoSatisfeita ? ` (condição ${r.protecao.condicaoSatisfeita.toUpperCase()} atendida — C.2.1.9)` : ""}
        </div>
        ${!r.protecao.protegido ? `<div style="font-size:11.5px; color:var(--gray-text); margin-top:4px;">Nenhuma das condições de C.2.1.9 foi satisfeita com os parâmetros informados. Revise Up, ΔU, comprimento do circuito, ou considere medidas alternativas (C.2.1.9-d).</div>` : ""}
        ${r.aviso2x.risco ? `<div style="font-size:11px; color:var(--warn); margin-top:6px;">⚠ ${esc(r.aviso2x.mensagem)}</div>` : ""}
        ${r.deltaU.avisoEstimativa ? `<div style="font-size:10.5px; color:var(--gray-text); margin-top:6px; font-style:italic;">${esc(r.deltaU.avisoEstimativa)}</div>` : ""}
      </div>
    `;
  }

  /* ============================================================
     UI — Subseção Interfaces isolantes (3.74). Cadastro qualitativo,
     sem motor de cálculo (não há Up/f associado a este dispositivo).
     ============================================================ */
  function interfaceIsolanteBlock(ii, i) {
    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_MPS.removerInterfaceIsolante(${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Identificação</label>
            <input type="text" class="ii-nome" data-i="${i}" value="${esc(ii.nome || "")}" placeholder="ex: interface óptica — linha de sinal">
          </div>
          <div class="field"><label>Serviço</label>
            <select class="ii-servico" data-i="${i}">
              <option value="energia" ${ii.servico === "energia" ? "selected" : ""}>Energia</option>
              <option value="sinal" ${ii.servico === "sinal" ? "selected" : ""}>Sinal</option>
            </select>
          </div>
          <div class="field"><label>Observação técnica</label>
            <input type="text" class="ii-descricao" data-i="${i}" value="${esc(ii.descricao || "")}" placeholder="opcional">
          </div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     UI — Subseção Campo magnético / blindagem / tensões e correntes
     induzidas (Anexo A.4 e A.5). Segue o mesmo padrão visual de
     pontoDPSBlock/renderPreviewDPS.
     ============================================================ */
  function renderAvisoKcReaproveitado(a) {
    if (!a.dimensionamento) return "";
    const rKc = NEMAX_CALC_P3.resolverKc(a.dimensionamento);
    if (!rKc) return "";
    return `<p style="font-size:11.5px; color:var(--gray-text); margin-bottom:10px;">
      ℹ Coeficiente kc já calculado no Módulo 8 (Dimensionamento físico do SPDA) é reaproveitado
      automaticamente abaixo como contexto técnico: kc = ${rKc.value.toFixed(3)} (${esc(rKc.norma)}).
    </p>`;
  }

  function avaliacaoCampoBlock(a, c, i) {
    let preview = "";
    const r = calcularAvaliacaoCampo(a, c);
    if (r) preview = renderPreviewCampo(r);

    return `
      <div class="repeat-block">
        <button class="repeat-remove" onclick="M_MPS.removerAvaliacaoCampo(${i})">×</button>
        <div class="field-grid cols-3">
          <div class="field"><label>Identificação</label>
            <input type="text" class="campo-nome" data-i="${i}" value="${esc(c.nome || "")}" placeholder="ex: sala de TI — ZPR 1">
          </div>
          <div class="field"><label>Cenário (A.4.1)</label>
            <select class="campo-cenario" data-i="${i}">
              <option value="direto" ${c.cenario === "direto" ? "selected" : ""}>Impacto direto na estrutura (A.4.1.1)</option>
              <option value="proximo" ${c.cenario === "proximo" ? "selected" : ""}>Impacto próximo / descarga atmosférica próxima (A.4.1.2)</option>
            </select>
          </div>
          <div class="field"><label>Material da blindagem (Tabela A.4)</label>
            <select class="campo-material" data-i="${i}">
              <option value="cobre" ${c.materialBlindagem === "cobre" ? "selected" : ""}>Cobre</option>
              <option value="aluminio" ${c.materialBlindagem === "aluminio" ? "selected" : ""}>Alumínio</option>
              <option value="aco" ${c.materialBlindagem === "aco" ? "selected" : ""}>Aço (μr ≈ 200)</option>
            </select>
          </div>

          <div class="field"><label>Largura da malha wm (m)</label>
            <input type="number" step="0.1" class="campo-wm" data-i="${i}" value="${esc(c.wm || "")}">
          </div>
          <div class="field"><label>Malha de equipotencialização instalada? (5.2/5.3)</label>
            <select class="campo-malha-equip" data-i="${i}">
              <option value="nao" ${!c.malhaEquipotencial ? "selected" : ""}>Não</option>
              <option value="sim" ${c.malhaEquipotencial ? "selected" : ""}>Sim (+6 dB no SF)</option>
            </select>
          </div>
          <div class="field"><label>Fator de configuração kh</label>
            <input type="number" step="0.001" class="campo-kh" data-i="${i}" value="${esc(c.kh || "0.01")}">
            <span class="hint">padrão 0,01 (A.4.1.1.1.3)</span>
          </div>

          ${c.materialBlindagem === "aco" ? `
          <div class="field"><label>Frequência de referência</label>
            <select class="campo-freq" data-i="${i}">
              <option value="25khz" ${c.freq25kHz ? "selected" : ""}>25 kHz (1ª componente positiva)</option>
              <option value="1mhz" ${!c.freq25kHz ? "selected" : ""}>1 MHz ou 250 kHz (subsequente / 1ª negativa)</option>
            </select>
          </div>
          ${c.freq25kHz ? `
          <div class="field"><label>Raio do condutor da blindagem rc (m)</label>
            <input type="number" step="0.001" class="campo-rc" data-i="${i}" value="${esc(c.rc || "")}">
          </div>
          <div class="field"></div>
          ` : `<div class="field"></div><div class="field"></div>`}
          ` : ""}

          ${c.cenario === "direto" ? `
          <div class="field"><label>Distância à parede dw (m)</label>
            <input type="number" step="0.1" class="campo-dw" data-i="${i}" value="${esc(c.dw || "")}">
          </div>
          <div class="field"><label>Distância à cobertura dr (m)</label>
            <input type="number" step="0.1" class="campo-dr" data-i="${i}" value="${esc(c.dr || "")}">
          </div>
          <div class="field"></div>
          ` : `
          <div class="field"><label>Sa — distância ao canal da descarga (m), opcional</label>
            <input type="number" step="0.1" class="campo-sa" data-i="${i}" value="${esc(c.Sa || "")}">
            <span class="hint">deixe em branco para calcular automaticamente (A.17/A.18)</span>
          </div>
          ${!c.Sa ? `
          <div class="field"><label>Altura da estrutura H (m)</label>
            <input type="number" step="0.1" class="campo-altura" data-i="${i}" value="${esc(c.alturaEstrutura || "")}">
          </div>
          <div class="field"><label>Comprimento da estrutura L (m)</label>
            <input type="number" step="0.1" class="campo-comprimento" data-i="${i}" value="${esc(c.comprimentoEstrutura || "")}">
          </div>
          <div class="field"><label>Raio da esfera rolante r (m), opcional</label>
            <input type="number" step="1" class="campo-raio-esfera" data-i="${i}" value="${esc(c.raioEsferaRolante || "")}">
            <span class="hint">deixe em branco para reaproveitar o raio já tabelado por NP (Módulo 8)</span>
          </div>
          ` : `<div class="field"></div><div class="field"></div>`}
          `}

          <div class="field"><label>Avaliar também tensão/corrente induzida? (Anexo A.5)</label>
            <select class="campo-calc-inducao" data-i="${i}">
              <option value="nao" ${!c.calcularInducao ? "selected" : ""}>Não</option>
              <option value="sim" ${c.calcularInducao ? "selected" : ""}>Sim</option>
            </select>
          </div>
          <div class="field"></div><div class="field"></div>

          ${c.calcularInducao ? `
          <div class="field"><label>Comprimento do laço l (m)</label>
            <input type="number" step="0.1" class="campo-laco-l" data-i="${i}" value="${esc(c.lacoL || "")}">
          </div>
          <div class="field"><label>Largura do laço b (m)</label>
            <input type="number" step="0.1" class="campo-laco-b" data-i="${i}" value="${esc(c.lacoB || "")}">
          </div>
          <div class="field"><label>Raio do condutor do laço rc (m)</label>
            <input type="number" step="0.001" class="campo-laco-rc" data-i="${i}" value="${esc(c.lacoRc || "0.005")}">
          </div>
          ${c.cenario === "direto" ? `
          <div class="field"><label>Distância do laço à parede dl/w (m)</label>
            <input type="number" step="0.1" class="campo-dlw" data-i="${i}" value="${esc(c.dlw || "")}">
            <span class="hint">dl/w ≥ ds/1</span>
          </div>
          <div class="field"><label>Distância do laço ao teto dl/r (m)</label>
            <input type="number" step="0.1" class="campo-dlr" data-i="${i}" value="${esc(c.dlr || "")}">
          </div>
          <div class="field"></div>
          ` : ""}
          ` : ""}
        </div>
        ${preview}
      </div>
    `;
  }

  function renderPreviewCampo(r) {
    const linhas = [];
    if (r.cenario === "direto") {
      linhas.push(`<tr><td>H1/F/MÁX (1ª positiva)</td><td>${r.H1_F.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>H1/FN/MÁX (1ª negativa)</td><td>${r.H1_FN.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>H1/S/MÁX (subsequente)</td><td>${r.H1_S.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>Afastamento para a blindagem ds/1</td><td>${r.ds.value.toFixed(3)} m</td></tr>`);
    } else {
      linhas.push(`<tr><td>Sa (distância ao canal)</td><td>${r.sa.value.toFixed(2)} m</td></tr>`);
      linhas.push(`<tr><td>H0/F/MÁX → H1/F/MÁX</td><td>${r.H0_F.value.toFixed(1)} → ${r.H1_F.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>H0/FN/MÁX → H1/FN/MÁX</td><td>${r.H0_FN.value.toFixed(1)} → ${r.H1_FN.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>H0/S/MÁX → H1/S/MÁX</td><td>${r.H0_S.value.toFixed(1)} → ${r.H1_S.value.toFixed(1)} A/m</td></tr>`);
      linhas.push(`<tr><td>Afastamento para a blindagem ds/2</td><td>${r.ds.value.toFixed(3)} m</td></tr>`);
    }
    let inducaoHtml = "";
    if (r.UOC_F) {
      inducaoHtml = `
        <div style="margin-top:10px; font-size:12px; font-weight:700;">Tensões/correntes induzidas (Anexo A.5)</div>
        <table class="hist-table" style="font-size:11.5px; margin-top:4px;">
          <thead><tr><th>Componente</th><th>Uoc/máx</th><th>Isc/máx</th></tr></thead>
          <tbody>
            <tr><td>1ª positiva</td><td>${r.UOC_F.value.toFixed(1)} V</td><td>${r.ISC_F.value.toFixed(2)} A</td></tr>
            <tr><td>1ª negativa</td><td>${r.UOC_FN.value.toFixed(1)} V</td><td>${r.ISC_FN.value.toFixed(2)} A</td></tr>
            <tr><td>Subsequente</td><td>${r.UOC_S.value.toFixed(1)} V</td><td>${r.ISC_S.value.toFixed(2)} A</td></tr>
          </tbody>
        </table>
      `;
    }
    return `
      <div style="margin-top:14px; padding:12px 16px; border-radius:6px; background:var(--gray-light); border:1px solid var(--line);">
        <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">SF = ${r.SF.value.toFixed(2)} dB — NP ${esc(r.NP)}</div>
        <table class="hist-table" style="font-size:11.5px;">
          <tbody>${linhas.join("")}</tbody>
        </table>
        ${inducaoHtml}
        ${r.kcReaproveitado ? `<p style="font-size:10.5px; color:var(--gray-text); margin-top:8px;">kc reaproveitado do Módulo 8: ${r.kcReaproveitado.value.toFixed(3)} (${esc(r.kcReaproveitado.norma)})</p>` : ""}
      </div>
    `;
  }

  /* Calcula tudo para um ponto de DPS — usado tanto na pré-visualização quanto
     na verificação final / memorial. Retorna null se dados insuficientes. */
  function calcularPontoDPS(p) {
    const up = parseFloat(p.up);
    if (isNaN(up)) return null;

    let uw;
    if (p.uwManual !== "" && p.uwManual !== undefined && p.uwManual !== null && !isNaN(parseFloat(p.uwManual))) {
      uw = parseFloat(p.uwManual);
    } else {
      const rUw = NEMAX_CALC_P4.tabelaA1_uw(p.faixaFaseTensao, p.categoriaProduto);
      if (!rUw) return null;
      uw = rUw.value;
    }

    let deltaU;
    if (p.deltaUModo === "manual") {
      const dm = parseFloat(p.deltaUManual);
      if (isNaN(dm)) return null;
      deltaU = { value: dm, formula: "ΔU informado manualmente", norma: "Dado de fabricante/projeto", substituicao: `ΔU = ${dm} kV (informado pelo usuário)` };
    } else {
      const ik = parseFloat(p.deltaUCorrenteKA);
      const lm = parseFloat(p.deltaUComprimentoM);
      if (isNaN(ik) || isNaN(lm)) return null;
      deltaU = NEMAX_CALC_P4.calc_deltaU_estimado(ik, lm);
    }

    const upF = p.tipoDPS === "comutador"
      ? NEMAX_CALC_P4.calc_UpEfetivo_comutador(up, deltaU.value)
      : NEMAX_CALC_P4.calc_UpEfetivo_limitador(up, deltaU.value);

    const compCircuito = p.comprimentoCircuitoM === "" || p.comprimentoCircuitoM === undefined ? 0 : parseFloat(p.comprimentoCircuitoM);
    const protecao = NEMAX_CALC_P4.verificarCondicaoProtecao(upF.value, uw, compCircuito, !!p.sistemaCritico);
    const aviso2x = NEMAX_CALC_P4.avisoOscilacaoCircuitoLongo(upF.value, uw);

    return { up, uw, deltaU, upF, protecao, aviso2x };
  }

  /* ============================================================
     calcularAvaliacaoCampo — orquestra NEMAX_CALC_P4_CAMPO conforme o
     cenário escolhido (impacto direto / próximo), reaproveitando kc do
     Módulo 8 (Parte 3, NEMAX_CALC_P3.resolverKc) e o raio da esfera rolante
     já tabelado por NP (NEMAX_CALC_P3.tabelas.TABELA2_NP), conforme acordado
     com o usuário, em vez de pedir esses dados novamente.
     ============================================================ */
  function npAtualParaCampo(a) {
    return a.protecoes ? a.protecoes.npSpda : "nenhum";
  }

  function calcularAvaliacaoCampo(a, c) {
    const NP = npAtualParaCampo(a);
    if (NP === "nenhum") return null;

    const wm = parseFloat(c.wm);
    if (isNaN(wm) || wm <= 0) return null;

    // --- Fator de blindagem SF (Tabela A.4) ---
    let SF;
    if (c.materialBlindagem === "aco") {
      const rc = parseFloat(c.rc);
      if (c.freq25kHz && (isNaN(rc) || rc <= 0)) return null;
      SF = NEMAX_CALC_P4_CAMPO.calc_SF_planaAco(wm, rc, !!c.freq25kHz, !!c.malhaEquipotencial);
    } else {
      SF = NEMAX_CALC_P4_CAMPO.calc_SF_planaCobreAluminio(wm, !!c.malhaEquipotencial);
    }

    const kh = c.kh === "" || c.kh === undefined ? 0.01 : parseFloat(c.kh);
    if (isNaN(kh)) return null;

    let H1_F, H1_FN, H1_S, ds, H0_F, H0_FN, H0_S, sa;

    if (c.cenario === "direto") {
      const dw = parseFloat(c.dw), dr = parseFloat(c.dr);
      if (isNaN(dw) || isNaN(dr) || dw <= 0 || dr <= 0) return null;
      H1_F = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "F", wm, dw, dr, kh);
      H1_FN = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "FN", wm, dw, dr, kh);
      H1_S = NEMAX_CALC_P4_CAMPO.calc_H1_impactoDireto(NP, "S", wm, dw, dr, kh);
      if (!H1_F || !H1_FN || !H1_S) return null;
      ds = NEMAX_CALC_P4_CAMPO.calc_ds1(SF.value, wm);
    } else {
      // cenário "proximo"
      let Sa_val;
      if (c.Sa !== "" && c.Sa !== undefined && !isNaN(parseFloat(c.Sa))) {
        Sa_val = parseFloat(c.Sa);
        sa = { value: Sa_val, formula: "Sa informado manualmente", norma: "Dado de projeto/levantamento", substituicao: `Sa = ${Sa_val} m (informado pelo usuário)` };
      } else {
        const H = parseFloat(c.alturaEstrutura), L = parseFloat(c.comprimentoEstrutura);
        if (isNaN(H) || isNaN(L)) return null;
        // Reaproveita o raio da esfera rolante já tabelado por NP (Parte 3 /
        // Tabela 4 da Parte 1) quando o campo não foi preenchido manualmente.
        let r;
        if (c.raioEsferaRolante !== "" && c.raioEsferaRolante !== undefined && !isNaN(parseFloat(c.raioEsferaRolante))) {
          r = parseFloat(c.raioEsferaRolante);
        } else {
          const npNorm = NEMAX_CALC_P4_CAMPO.normalizarNP(NP);
          const npParaTabela2 = npNorm === "III-IV" ? (NP === "IV" ? "IV" : "III") : NP;
          const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[npParaTabela2];
          if (!tab2) return null;
          r = tab2.raioEsfera;
        }
        sa = NEMAX_CALC_P4_CAMPO.calc_sa(r, H, L);
        Sa_val = sa.value;
      }
      H0_F = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "F", Sa_val);
      H0_FN = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "FN", Sa_val);
      H0_S = NEMAX_CALC_P4_CAMPO.calc_H0_impactoProximo(NP, "S", Sa_val);
      if (!H0_F || !H0_FN || !H0_S) return null;
      H1_F = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_F.value, SF.value);
      H1_FN = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_FN.value, SF.value);
      H1_S = NEMAX_CALC_P4_CAMPO.calc_H1_atenuado_deH0(H0_S.value, SF.value);
      ds = NEMAX_CALC_P4_CAMPO.calc_ds2(SF.value, wm);
    }

    const resultado = { NP, SF, kh, H1_F, H1_FN, H1_S, ds, H0_F, H0_FN, H0_S, sa, cenario: c.cenario };

    // --- kc reaproveitado do Módulo 8, se disponível (informativo — não
    // entra diretamente nas equações de H1/H0, mas é exibido como contexto
    // técnico relevante para o projeto físico já dimensionado) ---
    if (a.dimensionamento) {
      const rKc = NEMAX_CALC_P3.resolverKc(a.dimensionamento);
      if (rKc) resultado.kcReaproveitado = rKc;
    }

    // --- Tensão/corrente induzida (Anexo A.5), se solicitado ---
    if (c.calcularInducao) {
      const l = parseFloat(c.lacoL), b = parseFloat(c.lacoB), rcLaco = parseFloat(c.lacoRc) || 0.005;
      if (!isNaN(l) && !isNaN(b) && l > 0 && b > 0) {
        const LS = NEMAX_CALC_P4_CAMPO.calc_LS_laco(l, b, rcLaco);
        resultado.LS = LS;
        if (c.cenario === "direto") {
          const dlw = parseFloat(c.dlw), dlr = parseFloat(c.dlr);
          if (!isNaN(dlw) && !isNaN(dlr) && dlw > 0 && dlr > 0) {
            const p = NEMAX_CALC_P4_CAMPO.parametrosNP(NP);
            resultado.UOC_F = NEMAX_CALC_P4_CAMPO.calc_UOC_max_F(b, l, dlw, dlr, wm, p.IF_MAX);
            resultado.ISC_F = NEMAX_CALC_P4_CAMPO.calc_ISC_max_F(b, l, dlw, dlr, wm, p.IF_MAX, LS.value);
            resultado.UOC_FN = NEMAX_CALC_P4_CAMPO.calc_UOC_max_FN(b, l, dlw, dlr, wm, p.IFN_MAX);
            resultado.ISC_FN = NEMAX_CALC_P4_CAMPO.calc_ISC_max_FN(b, l, dlw, dlr, wm, p.IFN_MAX, LS.value);
            resultado.UOC_S = NEMAX_CALC_P4_CAMPO.calc_UOC_max_S(b, l, dlw, dlr, wm, p.IS_MAX);
            resultado.ISC_S = NEMAX_CALC_P4_CAMPO.calc_ISC_max_S(b, l, dlw, dlr, wm, p.IS_MAX, LS.value);
          }
        } else {
          resultado.UOC_F = NEMAX_CALC_P4_CAMPO.calc_UOC_max_F_homogeneo(b, l, H1_F.value);
          resultado.ISC_F = NEMAX_CALC_P4_CAMPO.calc_ISC_max_F_homogeneo(b, l, H1_F.value, LS.value);
          resultado.UOC_FN = NEMAX_CALC_P4_CAMPO.calc_UOC_max_FN_homogeneo(b, l, H1_FN.value);
          resultado.ISC_FN = NEMAX_CALC_P4_CAMPO.calc_ISC_max_FN_homogeneo(b, l, H1_FN.value, LS.value);
          resultado.UOC_S = NEMAX_CALC_P4_CAMPO.calc_UOC_max_S_homogeneo(b, l, H1_S.value);
          resultado.ISC_S = NEMAX_CALC_P4_CAMPO.calc_ISC_max_S_homogeneo(b, l, H1_S.value, LS.value);
        }
      }
    }

    return resultado;
  }

  function addZona() {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.zonasIdentificadas.push({ zpr: "1", descricao: "" });
    salvarAnalise(a);
    App.render();
  }
  function removerZona(i) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.zonasIdentificadas.splice(i, 1);
    salvarAnalise(a);
    App.render();
  }
  function addPontoDPS() {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.pontosDPS.push(novoPontoDPS());
    salvarAnalise(a);
    App.render();
  }
  function removerPontoDPS(i) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.pontosDPS.splice(i, 1);
    salvarAnalise(a);
    App.render();
  }
  function addInterfaceIsolante() {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.interfacesIsolantes.push(novaInterfaceIsolante());
    salvarAnalise(a);
    App.render();
  }
  function removerInterfaceIsolante(i) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.interfacesIsolantes.splice(i, 1);
    salvarAnalise(a);
    App.render();
  }
  function addAvaliacaoCampo() {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.avaliacoesCampo.push(novaAvaliacaoCampo());
    salvarAnalise(a);
    App.render();
  }
  function removerAvaliacaoCampo(i) {
    Wizard.salvarAtual();
    const a = App.getCurrentAnalise();
    a.mps.avaliacoesCampo.splice(i, 1);
    salvarAnalise(a);
    App.render();
  }

  function qs(sel) { return document.querySelector(sel); }

  function bind(a) {
    // Padrão idêntico ao usado em M_DimensionamentoSPDA.bind(): re-renderiza ao
    // alterar um campo que afeta o resultado calculado exibido na tela (preview
    // de Up/f e situação de proteção, C.2.1.9). Os campos .dps-* relacionados ao
    // cálculo são repetidos por ponto de DPS (lista dinâmica), então usa
    // delegação de evento no contêiner pai (#pontos-dps) em vez de IDs fixos —
    // funciona para qualquer índice, inclusive pontos adicionados depois deste
    // bind() ter sido chamado. Usa 'change' (não 'input') para disparar apenas
    // ao perder o foco do campo, evitando re-render a cada tecla digitada.
    const CAMPOS_QUE_AFETAM_CALCULO = [
      "dps-tipo", "dps-faixa", "dps-categoria", "dps-uw-manual", "dps-up",
      "dps-deltau-modo", "dps-deltau-manual", "dps-deltau-corrente", "dps-deltau-comprimento",
      "dps-comp-circuito", "dps-critico",
    ];
    const container = document.getElementById("pontos-dps");
    if (container) {
      container.addEventListener("change", (ev) => {
        const afeta = CAMPOS_QUE_AFETAM_CALCULO.some((cls) => ev.target.classList.contains(cls));
        if (!afeta) return;
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    }

    // Mesmo padrão para a subseção de campo magnético (Anexo A.4/A.5, Entrega
    // 2) — qualquer campo .campo-* que afete o cálculo dispara re-render via
    // delegação no contêiner #avaliacoes-campo.
    const CAMPOS_CAMPO_QUE_AFETAM_CALCULO = [
      "campo-cenario", "campo-material", "campo-wm", "campo-malha-equip", "campo-kh",
      "campo-freq", "campo-rc", "campo-dw", "campo-dr", "campo-sa", "campo-altura",
      "campo-comprimento", "campo-raio-esfera", "campo-calc-inducao",
      "campo-laco-l", "campo-laco-b", "campo-laco-rc", "campo-dlw", "campo-dlr",
    ];
    const containerCampo = document.getElementById("avaliacoes-campo");
    if (containerCampo) {
      containerCampo.addEventListener("change", (ev) => {
        const afeta = CAMPOS_CAMPO_QUE_AFETAM_CALCULO.some((cls) => ev.target.classList.contains(cls));
        if (!afeta) return;
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    }
  }

  function coletar(a) {
    if (!a.mps) a.mps = novoEstadoMPS();
    if (!a.mps.avaliacoesCampo) a.mps.avaliacoesCampo = []; // retrocompat: análises salvas na Entrega 1
    if (!a.mps.interfacesIsolantes) a.mps.interfacesIsolantes = []; // retrocompat: análises salvas na Entrega 2
    a.mps.zonasIdentificadas.forEach((z, i) => {
      z.zpr = qs(`.zona-zpr[data-i="${i}"]`)?.value || "1";
      z.descricao = qs(`.zona-descricao[data-i="${i}"]`)?.value || "";
    });
    a.mps.interfacesIsolantes.forEach((ii, i) => {
      ii.nome = qs(`.ii-nome[data-i="${i}"]`)?.value || "";
      ii.servico = qs(`.ii-servico[data-i="${i}"]`)?.value || "energia";
      ii.descricao = qs(`.ii-descricao[data-i="${i}"]`)?.value || "";
    });
    a.mps.pontosDPS.forEach((p, i) => {
      p.nome = qs(`.dps-nome[data-i="${i}"]`)?.value || "";
      p.servico = qs(`.dps-servico[data-i="${i}"]`)?.value || "energia";
      p.tipoDPS = qs(`.dps-tipo[data-i="${i}"]`)?.value || "limitador";
      p.faixaFaseTensao = qs(`.dps-faixa[data-i="${i}"]`)?.value || "220 a 254";
      p.categoriaProduto = qs(`.dps-categoria[data-i="${i}"]`)?.value || "III";
      p.uwManual = qs(`.dps-uw-manual[data-i="${i}"]`)?.value || "";
      p.up = qs(`.dps-up[data-i="${i}"]`)?.value || "";
      p.deltaUModo = qs(`.dps-deltau-modo[data-i="${i}"]`)?.value || "estimado";
      p.deltaUManual = qs(`.dps-deltau-manual[data-i="${i}"]`)?.value || "";
      p.deltaUCorrenteKA = qs(`.dps-deltau-corrente[data-i="${i}"]`)?.value || "";
      p.deltaUComprimentoM = qs(`.dps-deltau-comprimento[data-i="${i}"]`)?.value || "";
      p.comprimentoCircuitoM = qs(`.dps-comp-circuito[data-i="${i}"]`)?.value || "";
      p.sistemaCritico = (qs(`.dps-critico[data-i="${i}"]`)?.value || "nao") === "sim";
    });
    a.mps.avaliacoesCampo.forEach((c, i) => {
      c.nome = qs(`.campo-nome[data-i="${i}"]`)?.value || "";
      c.cenario = qs(`.campo-cenario[data-i="${i}"]`)?.value || "direto";
      c.materialBlindagem = qs(`.campo-material[data-i="${i}"]`)?.value || "cobre";
      c.wm = qs(`.campo-wm[data-i="${i}"]`)?.value || "";
      c.malhaEquipotencial = (qs(`.campo-malha-equip[data-i="${i}"]`)?.value || "nao") === "sim";
      c.kh = qs(`.campo-kh[data-i="${i}"]`)?.value || "0.01";
      c.freq25kHz = (qs(`.campo-freq[data-i="${i}"]`)?.value || "25khz") === "25khz";
      c.rc = qs(`.campo-rc[data-i="${i}"]`)?.value || "";
      c.dw = qs(`.campo-dw[data-i="${i}"]`)?.value || "";
      c.dr = qs(`.campo-dr[data-i="${i}"]`)?.value || "";
      c.Sa = qs(`.campo-sa[data-i="${i}"]`)?.value || "";
      c.alturaEstrutura = qs(`.campo-altura[data-i="${i}"]`)?.value || "";
      c.comprimentoEstrutura = qs(`.campo-comprimento[data-i="${i}"]`)?.value || "";
      c.raioEsferaRolante = qs(`.campo-raio-esfera[data-i="${i}"]`)?.value || "";
      c.calcularInducao = (qs(`.campo-calc-inducao[data-i="${i}"]`)?.value || "nao") === "sim";
      c.lacoL = qs(`.campo-laco-l[data-i="${i}"]`)?.value || "";
      c.lacoB = qs(`.campo-laco-b[data-i="${i}"]`)?.value || "";
      c.lacoRc = qs(`.campo-laco-rc[data-i="${i}"]`)?.value || "0.005";
      c.dlw = qs(`.campo-dlw[data-i="${i}"]`)?.value || "";
      c.dlr = qs(`.campo-dlr[data-i="${i}"]`)?.value || "";
    });
  }

  return {
    render, bind, coletar,
    addZona, removerZona, addPontoDPS, removerPontoDPS,
    addInterfaceIsolante, removerInterfaceIsolante,
    addAvaliacaoCampo, removerAvaliacaoCampo,
    calcularPontoDPS, calcularAvaliacaoCampo,
  };
})();

/* ============================================================
   PAINEL DE CONSISTÊNCIA CRUZADO — Módulo 9 (MPS) × Módulo 6 (Proteções, NBR 5419-2)
   ============================================================ */
function verificarConsistenciaMPS(a) {
  const avisos = [];
  const m = a.mps;
  if (!m) return avisos;

  const p = a.protecoes || {};
  const npDPS = p.npDPS || "nenhum"; // probabilístico, Módulo 6
  const npDPSClasseI = p.npDPSClasseI || "nenhum";

  const algumPontoDPS = m.pontosDPS && m.pontosDPS.length > 0;
  const algumProtegido = algumPontoDPS && m.pontosDPS.some((pt) => {
    const r = M_MPS.calcularPontoDPS(pt);
    return r && r.protecao.protegido;
  });
  const algumNaoProtegido = algumPontoDPS && m.pontosDPS.some((pt) => {
    const r = M_MPS.calcularPontoDPS(pt);
    return r && !r.protecao.protegido;
  });

  // 1) Risco assumiu DPS coordenado (P_SPD < 1), mas nenhum ponto físico foi dimensionado aqui (VERMELHO)
  if (npDPS !== "nenhum" && !algumPontoDPS) {
    avisos.push({
      nivel: "vermelho",
      titulo: "DPS assumido na análise de risco, mas não dimensionado fisicamente",
      mensagem: `A análise de risco (Módulo 6) assumiu um sistema coordenado de DPS projetado para NP ${npDPS} (reduzindo P_SPD), mas nenhum ponto de DPS foi dimensionado neste módulo (NBR 5419-4, Anexo C). O benefício de redução de risco assumido em P_SPD depende de o sistema de DPS realmente existir e estar corretamente especificado — cadastre ao menos um ponto de DPS coordenado, ou revise o valor de P_SPD no Módulo 6 caso o DPS ainda não esteja definido.`,
    });
  }

  // 2) DPS classe I assumido no risco (P_EB), mas nenhum ponto aqui marcado como classe I/energia na entrada (AMARELO)
  if (npDPSClasseI !== "nenhum" && !algumPontoDPS) {
    avisos.push({
      nivel: "amarelo",
      titulo: "DPS classe I assumido na análise de risco sem dimensionamento correspondente",
      mensagem: `O Módulo 6 assumiu DPS classe I na entrada da linha, projetado para NP ${npDPSClasseI} (reduzindo P_EB). Cadastre o ponto de DPS de entrada de energia neste módulo para confirmar que a configuração física é compatível com a premissa usada no cálculo de risco.`,
    });
  }

  // 3) Pontos de DPS dimensionados aqui, mas risco não considera nenhum DPS (P_SPD = 1) — oportunidade, não erro (AMARELO)
  if (algumPontoDPS && algumProtegido && npDPS === "nenhum") {
    avisos.push({
      nivel: "amarelo",
      titulo: "Sistema de DPS dimensionado, mas não refletido na análise de risco",
      mensagem: `Há ao menos um ponto de DPS coordenado dimensionado e verificado como protegido neste módulo (NBR 5419-4, Anexo C), mas a análise de risco (Módulo 6) ainda assume P_SPD = 1 (nenhum DPS coordenado). Se o sistema projetado aqui corresponde ao que será efetivamente instalado, considere atualizar o campo "Sistema coordenado de DPS — NP" no Módulo 6 para refletir o NP real, reduzindo R_M/R_W/R_Z na análise de risco.`,
    });
  }

  // 4) Algum ponto de DPS dimensionado neste módulo falhou na verificação de C.2.1.9 (VERMELHO)
  if (algumNaoProtegido) {
    avisos.push({
      nivel: "vermelho",
      titulo: "Ponto de DPS não atende às condições de proteção adequada (C.2.1.9)",
      mensagem: `Ao menos um ponto de DPS cadastrado não satisfaz nenhuma das condições de C.2.1.9 (Up/f ≤ Uw nas variantes aplicáveis). O equipamento associado não está adequadamente protegido com os parâmetros informados — revise Up do DPS, ΔU, comprimento do circuito, ou adote as medidas alternativas de C.2.1.9-d) (DPS adicional próximo ao equipamento, ou DPS de duas portas com cabeamento blindado).`,
    });
  }

  // 5) "Interfaces isolantes (NBR 5419-4)" assumida como condição da linha no
  // Módulo 6 (C_LD=C_LI=0, o melhor caso possível — Tabela B.4, índice 8),
  // mas nenhuma interface isolante cadastrada fisicamente aqui (VERMELHO)
  const interfacesIsolantes = m.interfacesIsolantes || [];
  if (p.condicaoLinha === 8 && interfacesIsolantes.length === 0) {
    avisos.push({
      nivel: "vermelho",
      titulo: "Interfaces isolantes assumidas na análise de risco, mas não cadastradas",
      mensagem: `A condição da linha elétrica assumida no Módulo 6 é "Interfaces isolantes (NBR 5419-4)" (C_LD=0, C_LI=0 — o melhor caso possível na Tabela B.4), mas nenhuma interface isolante foi cadastrada neste módulo (3.74). Esse benefício de risco depende da existência real do dispositivo — cadastre as interfaces isolantes correspondentes, ou revise a condição da linha no Módulo 6 caso o projeto utilize DPS coordenado em vez de interfaces isolantes.`,
    });
  }

  // 6) Número de linhas cadastradas (Módulo 4) vs. número de pontos de DPS
  // dedicados por serviço aqui (AMARELO — entrada sem proteção física dedicada)
  const linhas = a.linhas || { energia: [], sinal: [] };
  const nLinhasEnergia = (linhas.energia || []).length;
  const nLinhasSinal = (linhas.sinal || []).length;
  const nDPSEnergia = (m.pontosDPS || []).filter((pt) => pt.servico === "energia").length;
  const nDPSSinal = (m.pontosDPS || []).filter((pt) => pt.servico === "sinal").length;
  const nInterfacesEnergia = interfacesIsolantes.filter((ii) => ii.servico === "energia").length;
  const nInterfacesSinal = interfacesIsolantes.filter((ii) => ii.servico === "sinal").length;

  if (nLinhasEnergia > 0 && nDPSEnergia === 0 && nInterfacesEnergia === 0) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Linhas de energia cadastradas sem ponto de DPS ou interface isolante dedicado",
      mensagem: `Há ${nLinhasEnergia} linha(s) de energia cadastrada(s) no Módulo 4, mas nenhum ponto de DPS nem interface isolante de serviço "energia" foi cadastrado neste módulo. Verifique se a entrada de energia possui proteção física correspondente, ou se um ponto já cadastrado cobre múltiplas linhas compartilhando o mesmo quadro de entrada.`,
    });
  }
  if (nLinhasSinal > 0 && nDPSSinal === 0 && nInterfacesSinal === 0) {
    avisos.push({
      nivel: "amarelo",
      titulo: "Linhas de sinal cadastradas sem ponto de DPS ou interface isolante dedicado",
      mensagem: `Há ${nLinhasSinal} linha(s) de sinal cadastrada(s) no Módulo 4, mas nenhum ponto de DPS nem interface isolante de serviço "sinal" foi cadastrado neste módulo. Verifique se as entradas de sinal possuem proteção física correspondente.`,
    });
  }

  return avisos;
}

function renderPainelConsistenciaMPS(a) {
  const avisos = verificarConsistenciaMPS(a);
  if (avisos.length === 0) return "";

  const vermelhos = avisos.filter((x) => x.nivel === "vermelho");
  const amarelos = avisos.filter((x) => x.nivel === "amarelo");

  function bloco(item) {
    const cor = item.nivel === "vermelho" ? "#f87171" : "#fb923c";
    const bg = item.nivel === "vermelho" ? "rgba(248,113,113,0.14)" : "rgba(251,146,60,0.14)";
    return `<div style="border-left:4px solid ${cor}; background:${bg}; padding:10px 14px; margin-bottom:8px; border-radius:4px;">
      <div style="font-weight:700; font-size:12.5px; color:${cor};">${item.nivel === "vermelho" ? "⚠ " : "ℹ "}${esc(item.titulo)}</div>
      <div style="font-size:12px; color:var(--gray-text); margin-top:3px; line-height:1.5;">${esc(item.mensagem)}</div>
    </div>`;
  }

  return `
    <div class="subsection" style="border-color:${vermelhos.length ? "#f87171" : "#fb923c"};">
      <div class="subsection-title">Verificação de consistência — MPS × Análise de risco (${avisos.length} item${avisos.length > 1 ? "ns" : ""})</div>
      ${vermelhos.map(bloco).join("")}
      ${amarelos.map(bloco).join("")}
      <p style="font-size:10.5px; color:var(--gray-text); margin-top:6px;">Cruza dados entre este módulo e o Módulo 6 (Proteções, NBR 5419-2); não substitui a análise técnica do responsável.</p>
    </div>
  `;
}

/* ============================================================
   MEMORIAL DESCRITIVO AUTOMÁTICO — Módulo 9 (MPS)
   Segue o mesmo padrão de texto corrido do Módulo 8 (Parte 3):
   parágrafos em partes.push(...), esc() em entradas do usuário,
   condicionais por estado de preenchimento.
   ============================================================ */
function gerarMemorialDescritivoMPS(a) {
  const m = a.mps;
  if (!m || (m.zonasIdentificadas.length === 0 && m.pontosDPS.length === 0)) {
    return "<p>Memorial não aplicável: nenhuma zona de proteção ou ponto de DPS foi cadastrado neste módulo.</p>";
  }
  const partes = [];

  // --- Introdução / terminologia ---
  partes.push(
    `As Medidas de Proteção contra Surtos (MPS) descritas neste memorial foram elaboradas em ` +
    `conformidade com a ABNT NBR 5419-4:2026, com o objetivo de proteger os sistemas elétricos e ` +
    `eletrônicos internos da edificação contra os efeitos do Pulso Eletromagnético causado por ` +
    `Descarga Atmosférica (LEMP). ${NEMAX_CALC_P4.TERMINOLOGIA.NOTA_LIMITE_SPDA3}`
  );

  // --- Zoneamento ---
  if (m.zonasIdentificadas.length > 0) {
    const zonasTexto = m.zonasIdentificadas.map((z) => {
      const zc = NEMAX_CALC_P4.listarZPR().find((x) => x.id === z.zpr);
      const desc = z.descricao ? ` (${esc(z.descricao)})` : "";
      return `${esc(zc ? zc.label : z.zpr)}${desc}`;
    }).join("; ");
    partes.push(
      `A edificação foi dividida nas seguintes Zonas de Proteção contra Raio (ZPR), conforme 4.3.1: ` +
      `${zonasTexto}. As fronteiras entre zonas sucessivas devem ser estabelecidas pelas medidas de ` +
      `proteção empregadas — interfaces isolantes, DPS, ou blindagem espacial — de modo que a severidade ` +
      `do LEMP em cada zona seja compatível com a suportabilidade dos sistemas internos nela instalados ` +
      `(4.1.2).`
    );
  } else {
    partes.push(
      `Nenhuma Zona de Proteção contra Raio (ZPR) foi cadastrada neste módulo; recomenda-se a divisão da ` +
      `edificação em ZPR conforme 4.3.1 como etapa preliminar ao detalhamento das MPS.`
    );
  }

  // --- DPS coordenado ---
  if (m.pontosDPS.length > 0) {
    partes.push(
      `O sistema coordenado de Dispositivos de Proteção contra Surtos (DPS) foi selecionado e verificado ` +
      `conforme o Anexo C da ABNT NBR 5419-4:2026, ponto a ponto, conforme detalhado a seguir.`
    );
    m.pontosDPS.forEach((p) => {
      const r = M_MPS.calcularPontoDPS(p);
      const nome = esc(p.nome) || "Ponto de DPS não identificado";
      if (!r) {
        partes.push(
          `<b>${nome}</b>: dados insuficientes para a verificação completa de Up/f — informe Up do DPS e ` +
          `os parâmetros de ΔU (estimado ou manual) para concluir esta verificação.`
        );
        return;
      }
      const tipoTxt = p.tipoDPS === "comutador" ? "comutador de tensão (C.2.1.3-b)" : "limitador de tensão (C.2.1.3-a)";
      const formulaTxt = p.tipoDPS === "comutador" ? "Up/f = Máx.(Up, ΔU)" : "Up/f = Up + ΔU";
      let txt = `<b>${nome}</b> (serviço: ${p.servico === "energia" ? "energia" : "sinal"}): DPS do tipo ` +
        `${tipoTxt}, com Up = ${r.up.toFixed(2)} kV. ${r.deltaU.substituicao}`;
      if (r.deltaU.avisoEstimativa) {
        txt += ` <i>(estimativa orientativa conforme NOTA de C.2.1.4 — substituir por dado de fabricante ou medição quando disponível)</i>`;
      }
      txt += ` Aplicando ${formulaTxt}, resulta Up/f = ${r.upF.value.toFixed(3)} kV. A tensão suportável de ` +
        `impulso do equipamento (Uw) é ${r.uw.toFixed(2)} kV` +
        `${p.uwManual ? ", informada manualmente pelo responsável técnico" : " (Tabela A.1)"}. `;
      if (r.protecao.protegido) {
        const condLabel = { a: "(a)", b: "(b)", c: "(c)" }[r.protecao.condicaoSatisfeita] || "";
        txt += `O equipamento é considerado adequadamente protegido, satisfazendo a condição ${condLabel} ` +
          `de C.2.1.9.`;
      } else {
        txt += `<b>O equipamento NÃO é considerado adequadamente protegido</b> com os parâmetros informados — ` +
          `nenhuma das condições de C.2.1.9 foi satisfeita. Recomenda-se revisar o Up do DPS, o comprimento e ` +
          `roteamento do circuito, ou adotar as medidas alternativas de C.2.1.9-d) (DPS adicional próximo ao ` +
          `equipamento, ou DPS de duas portas com cabeamento blindado ou roteamento conjunto de condutores vivos ` +
          `e PE).`;
      }
      if (r.aviso2x.risco) {
        txt += ` ${esc(r.aviso2x.mensagem)}`;
      }
      partes.push(txt);
    });
  } else {
    partes.push(
      `Nenhum ponto de DPS foi cadastrado neste módulo. A seleção e verificação do sistema coordenado de ` +
      `DPS, conforme o Anexo C, deve ser realizada para cada ponto de entrada de linha (energia e sinal) ` +
      `na estrutura e em cada fronteira de ZPR (7.1.1, 7.1.2).`
    );
  }

  // --- Seções mínimas de equipotencialização (Tabela 1) ---
  partes.push(
    `Os condutores e barras de equipotencialização da rede de ligação equipotencial devem atender às ` +
    `seções transversais mínimas estabelecidas na Tabela 1 da ABNT NBR 5419-4:2026 (5.6.1), conforme o ` +
    `material e a função de cada componente — barras de equipotencialização (50 mm² em cobre), condutores ` +
    `de conexão ao subsistema de aterramento (50 mm² em cobre ou 70 mm² em aço revestido), condutores entre ` +
    `barras de equipotencialização (16 mm² em cobre, conduzindo total ou parte significativa da corrente da ` +
    `descarga atmosférica) e condutores de interligação dos DPS, diferenciados por classe de ensaio ` +
    `(16 mm² para Classe I, 6 mm² para Classe II e 2,5 mm² para Classe III, em cobre).`
  );

  return partes.map((p) => `<p style="margin-bottom:10px; line-height:1.7; text-align:justify;">${p}</p>`).join("\n");
}




/* ============================================================
   ORQUESTRAÇÃO DE CÁLCULO — conecta os dados coletados ao
   motor de fórmulas (NEMAX_CALC) e monta a memória de cálculo
   ============================================================ */

const Calculo = (function () {
  function lookupPB(npSpda) {
    const map = { nenhum: 1, IV: 0.2, III: 0.1, II: 0.05, I: 0.02 };
    return map[npSpda] !== undefined ? map[npSpda] : 1;
  }
  function lookupPSPD(npDPS) {
    const map = { nenhum: 1, "III-IV": 0.05, II: 0.02, I: 0.01 };
    return map[npDPS] !== undefined ? map[npDPS] : 1;
  }
  function lookupPEB(npDPSClasseI) {
    const map = { nenhum: 1, "III-IV": 0.05, II: 0.02, I: 0.01 };
    return map[npDPSClasseI] !== undefined ? map[npDPSClasseI] : 1;
  }
  function lookupCI(instalacao) {
    return instalacao === "subterranea" ? 0.5 : 1;
  }

  function executar(a) {
    const mem = []; // memória de cálculo: [{grupo, ...calcObj}]
    const push = (grupo, calcObj) => { mem.push(Object.assign({ grupo }, calcObj)); return calcObj.value; };

    const e = a.estrutura;
    const at = a.atmosferico;
    const p = a.protecoes;
    const f = a.fontesDano;
    const NG = at.ng || 0;
    const L = e.comprimento || 0, W = e.largura || 0, H = e.altura || 0;
    const nz = e.numOcupantes || 1, nt = e.numOcupantes || 1, tz = e.taxaOcupacao || 8760;
    const rs = e.tipoConstrucao, rt = e.tipoSuperficie, rp = e.providenciasIncendio, rf = e.riscoIncendio, hz = e.perigoEspecial;

    const gateD3 = e.materiaisExplosivos || e.tipo === "Hospitalar"; // Tabela 2, nota 'a'

    /* ---------- ÁREAS DE EXPOSIÇÃO EQUIVALENTE (Anexo A) ---------- */
    const AD = push("areas", calc_AD_wrap(L, W, H));
    const AM = push("areas", calc_AM_wrap(L, W));

    let NDJ = 0;
    if (e.temEstruturaAdjacente && e.distanciaAdjacente && e.alturaAdjacente) {
      mem.push({ grupo: "areas", formula: "N_DJ", norma: "ABNT NBR 5419-2:2026, 6.4.1, NOTA", substituicao: "N_DJ não calculado com rigor — requer dimensões (L,W) da estrutura adjacente, não coletadas. A norma permite desprezar N_DJ na maioria dos casos práticos." });
    }

    // Linhas — soma de contribuições de cada linha cadastrada (cada uma como trecho distinto, 6.4.3)
    let NL_total = 0, NI_total = 0;
    const todasLinhas = [...a.linhas.energia.map((l) => ({ ...l, origemTipo: "energia" })), ...a.linhas.sinal.map((l) => ({ ...l, origemTipo: "sinal", tipoLinha: 1 }))];
    todasLinhas.forEach((ln, idx) => {
      const CI = lookupCI(ln.instalacao);
      const CE = ln.ambiente;
      const CT = ln.tipoLinha;
      const LL = ln.comprimento || 1000;
      const AL = NEMAX_CALC.calc_AL(LL);
      mem.push(Object.assign({ grupo: "areas", item: `Linha ${idx + 1} (${ln.origemTipo})` }, AL));
      const NLcalc = NEMAX_CALC.calc_NL(NG, AL.value, CI, CE, CT);
      mem.push(Object.assign({ grupo: "eventos", item: `Linha ${idx + 1} (${ln.origemTipo})` }, NLcalc));
      NL_total += NLcalc.value;

      const AI = NEMAX_CALC.calc_AI(LL);
      mem.push(Object.assign({ grupo: "areas", item: `Linha ${idx + 1} (${ln.origemTipo})` }, AI));
      const NIcalc = NEMAX_CALC.calc_NI(NG, AI.value, CI, CE, CT);
      mem.push(Object.assign({ grupo: "eventos", item: `Linha ${idx + 1} (${ln.origemTipo})` }, NIcalc));
      NI_total += NIcalc.value;
    });

    /* ---------- EVENTOS PERIGOSOS (Anexo A) ---------- */
    const CD = e.localizacaoRelativa;
    const ND = push("eventos", NEMAX_CALC.calc_ND(NG, AD, CD));
    const NM = push("eventos", NEMAX_CALC.calc_NM(NG, AM));

    /* ---------- PROBABILIDADES (Anexo B) ---------- */
    const PB = lookupPB(p.npSpda);
    mem.push({ grupo: "probabilidades", formula: "P_B (Tabela B.2)", norma: "ABNT NBR 5419-2:2026, B.3.2", substituicao: `NP do SPDA = ${p.npSpda} → P_B = ${PB}` });
    const PTA = p.medidaToquePasso;
    const PA = push("probabilidades", NEMAX_CALC.calc_PA(PTA, PB));

    const PSPD = lookupPSPD(p.npDPS);
    mem.push({ grupo: "probabilidades", formula: "P_SPD (Tabela B.3)", norma: "ABNT NBR 5419-2:2026, B.4.2", substituicao: `NP do DPS = ${p.npDPS} → P_SPD = ${PSPD}` });
    const condLinha = NEMAX_CALC.tabelas.B4_CLD_CLI[p.condicaoLinha] || NEMAX_CALC.tabelas.B4_CLD_CLI[0];
    const CLD = condLinha.cld, CLI = condLinha.cli;
    mem.push({ grupo: "probabilidades", formula: "C_LD / C_LI (Tabela B.4)", norma: "ABNT NBR 5419-2:2026, B.4.2 / B.5.2", substituicao: `${condLinha.label} → C_LD=${CLD}, C_LI=${CLI}` });

    const PC = push("probabilidades", NEMAX_CALC.calc_PC(PSPD, CLD));

    const KS1obj = NEMAX_CALC.calc_KS1_KS2(p.wm);
    mem.push(Object.assign({ grupo: "probabilidades", item: "K_S1" }, KS1obj));
    const KS2obj = NEMAX_CALC.calc_KS1_KS2(p.wm);
    mem.push(Object.assign({ grupo: "probabilidades", item: "K_S2" }, KS2obj));
    const KS3 = p.ks3Tipo;
    mem.push({ grupo: "probabilidades", formula: "K_S3 (Tabela B.5)", norma: "ABNT NBR 5419-2:2026, B.4.10", substituicao: `Fiação interna selecionada → K_S3 = ${KS3}` });
    const KS4obj = NEMAX_CALC.calc_KS4(p.tensaoSuportavel);
    mem.push(Object.assign({ grupo: "probabilidades" }, KS4obj));
    const PMS = push("probabilidades", NEMAX_CALC.calc_PMS(KS1obj.value, KS2obj.value, KS3, KS4obj.value));
    const PM = push("probabilidades", NEMAX_CALC.calc_PM(PSPD, PMS));

    const PTU = p.medidaToqueLinha;
    const PEB = lookupPEB(p.npDPSClasseI);
    mem.push({ grupo: "probabilidades", formula: "P_EB (Tabela B.7)", norma: "ABNT NBR 5419-2:2026, B.5.2", substituicao: `NP DPS classe I = ${p.npDPSClasseI} → P_EB = ${PEB}` });
    const PLD = NEMAX_CALC.interp_tabela_kv(NEMAX_CALC.tabelas.B8_PLD, p.tensaoSuportavel, p.resistenciaBlindagem);
    mem.push({ grupo: "probabilidades", formula: "P_LD (Tabela B.8)", norma: "ABNT NBR 5419-2:2026, B.5.2", substituicao: `Condição de blindagem × U_W=${p.tensaoSuportavel}kV → P_LD = ${PLD}` });
    const PLI = NEMAX_CALC.interp_tabela_kv(NEMAX_CALC.tabelas.B9_PLI, p.tensaoSuportavel, 0);
    mem.push({ grupo: "probabilidades", formula: "P_LI (Tabela B.9)", norma: "ABNT NBR 5419-2:2026, B.8.2", substituicao: `Linha de energia × U_W=${p.tensaoSuportavel}kV → P_LI = ${PLI}` });

    const PU = push("probabilidades", NEMAX_CALC.calc_PU(PTU, PEB, PLD, CLD));
    const PV = push("probabilidades", NEMAX_CALC.calc_PV(PEB, PLD, CLD));
    const PW = push("probabilidades", NEMAX_CALC.calc_PW(PSPD, PLD, CLD));
    const PZ = push("probabilidades", NEMAX_CALC.calc_PZ(PSPD, PLI, CLI));

    /* ---------- PERDAS (Anexo C) — Perda de vida humana L1 ---------- */
    const LT = e.materiaisExplosivos ? 0.1 : 0.01;
    mem.push({ grupo: "perdas", formula: "L_T (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `${e.materiaisExplosivos ? "Risco de explosão" : "Todos os tipos"} → L_T = ${LT}` });

    let LF;
    if (e.tipo === "Hospitalar" || e.tipo === "Escolar") LF = 0.1;
    else if (e.tipo === "Área Pública" && e.presencaPublico) LF = 0.05;
    else if (e.tipo === "Industrial" || e.tipo === "Comercial") LF = 0.02;
    else LF = 0.01;
    mem.push({ grupo: "perdas", formula: "L_F (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `Tipo de estrutura: ${e.tipo} → L_F = ${LF}` });

    let LO = 0.001;
    if (e.materiaisExplosivos) LO = 0.1;
    else if (e.tipo === "Hospitalar") LO = 0.001;
    mem.push({ grupo: "perdas", formula: "L_O (Tabela C.2)", norma: "ABNT NBR 5419-2:2026, C.3.1, Tabela C.2", substituicao: `→ L_O = ${LO}` });

    const LA = push("perdas", NEMAX_CALC.calc_LA(rt, LT, nz, nt, tz, rs));
    const LB = push("perdas", NEMAX_CALC.calc_LB(rp, rf, hz, LF, nz, nt, tz, rs));
    const LC = push("perdas", NEMAX_CALC.calc_LC(LO, nz, nt, tz, rs));

    /* ---------- COMPONENTES DE RISCO (Seção 6, Eq. 4-11) ---------- */
    const comp = {};
    if (f.S1) {
      comp.RA = push("componentes", NEMAX_CALC.calc_R(ND, PA, LA, "R_A", 4, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (4)"));
      comp.RB = push("componentes", NEMAX_CALC.calc_R(ND, PB, LB, "R_B", 5, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (5)"));
      if (gateD3) comp.RC = push("componentes", NEMAX_CALC.calc_R(ND, PC, LC, "R_C", 6, "ABNT NBR 5419-2:2026, 6.2.1, Eq. (6)"));
    }
    if (f.S2 && gateD3) {
      comp.RM = push("componentes", NEMAX_CALC.calc_R(NM, PM, LC, "R_M", 7, "ABNT NBR 5419-2:2026, 6.3.1, Eq. (7)"));
    }
    if (f.S3) {
      const NLDJ = NL_total + NDJ;
      comp.RU = push("componentes", NEMAX_CALC.calc_R(NLDJ, PU, LA, "R_U", 8, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (8)"));
      comp.RV = push("componentes", NEMAX_CALC.calc_R(NLDJ, PV, LB, "R_V", 9, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (9)"));
      if (gateD3) comp.RW = push("componentes", NEMAX_CALC.calc_R(NLDJ, PW, LC, "R_W", 10, "ABNT NBR 5419-2:2026, 6.4.1, Eq. (10)"));
    }
    if (f.S4 && gateD3) {
      comp.RZ = push("componentes", NEMAX_CALC.calc_R(NI_total, PZ, LC, "R_Z", 11, "ABNT NBR 5419-2:2026, 6.5.1, Eq. (11)"));
    }

    /* ---------- RISCO R1 (Eq. 1) ---------- */
    const R1 = Object.values(comp).reduce((s, c) => s + c, 0);
    mem.push({
      grupo: "risco_final",
      formula: "R1 = R_A + R_B + R_C + R_M + R_U + R_V + R_W + R_Z",
      norma: "ABNT NBR 5419-2:2026, 4.3.1, Eq. (1)",
      substituicao: `R1 = ${Object.entries(comp).map(([k, v]) => v.toExponential(3)).join(" + ")} = ${R1.toExponential(4)} /ano`,
    });

    /* ---------- RISCO R3 (Eq. 2) — apenas se patrimônio cultural ---------- */
    let R3 = 0;
    if (e.patrimonioCultural) {
      const cz = 1, ct = 1; // sem dados de valor monetário coletados — relação unitária (estrutura inteira = 1 zona)
      const LB3 = NEMAX_CALC.calc_L3(rp, rf, LF, cz, ct);
      mem.push(Object.assign({ grupo: "perdas", item: "L3 — patrimônio cultural" }, LB3));
      const RB3 = f.S1 ? NEMAX_CALC.calc_R(ND, PB, LB3.value, "R_B (L3)", 5, "ABNT NBR 5419-2:2026, 6.2.1") : { value: 0 };
      const RV3 = f.S3 ? NEMAX_CALC.calc_R(NL_total + NDJ, PV, LB3.value, "R_V (L3)", 9, "ABNT NBR 5419-2:2026, 6.4.1") : { value: 0 };
      if (f.S1) mem.push(Object.assign({ grupo: "componentes" }, RB3));
      if (f.S3) mem.push(Object.assign({ grupo: "componentes" }, RV3));
      R3 = RB3.value + RV3.value;
      mem.push({ grupo: "risco_final", formula: "R3 = R_B(L3) + R_V(L3)", norma: "ABNT NBR 5419-2:2026, 4.3.1, Eq. (2)", substituicao: `R3 = ${RB3.value.toExponential(3)} + ${RV3.value.toExponential(3)} = ${R3.toExponential(4)} /ano` });
    } else {
      mem.push({ grupo: "risco_final", formula: "R3", norma: "ABNT NBR 5419-2:2026, 4.2.1.2", substituicao: "Não aplicável — edificação não indicada como patrimônio cultural (Módulo 2)." });
    }

    /* ---------- FREQUÊNCIA DE DANOS F (Seção 7, Eq. 14-15) ---------- */
    let F = 0;
    const compF = {};
    if (f.S1 && gateD3) compF.FC = push("frequencia", NEMAX_CALC.calc_F(ND, PC, "F_C", 15));
    if (f.S2 && gateD3) compF.FM = push("frequencia", NEMAX_CALC.calc_F(NM, PM, "F_M", 15));
    if (f.S3 && gateD3) compF.FW = push("frequencia", NEMAX_CALC.calc_F(NL_total + NDJ, PW, "F_W", 15));
    if (f.S4 && gateD3) compF.FZ = push("frequencia", NEMAX_CALC.calc_F(NI_total, PZ, "F_Z", 15));
    F = Object.values(compF).reduce((s, c) => s + c, 0);
    mem.push({
      grupo: "frequencia", formula: "F = F_B + F_C + F_M + F_V + F_W + F_Z", norma: "ABNT NBR 5419-2:2026, 7.1.3, Eq. (14)",
      substituicao: `Componentes calculados (F_C, F_M, F_W, F_Z): F = ${F.toExponential(4)} /ano. F_B (equipamento em ZPR0A) e a parcela de corrente direta F_V exigem avaliação específica de equipamento conforme 7.1.5 e não estão incluídas nesta soma simplificada.`,
    });

    const RT1 = NEMAX_CALC.constantes.RT1, RT3 = NEMAX_CALC.constantes.RT3;
    const conformeR1 = R1 <= RT1;
    const conformeR3 = !e.patrimonioCultural || R3 <= RT3;
    const conforme = conformeR1 && conformeR3;

    const resultado = {
      calculadoEm: nowISO(),
      AD, AM, ND, NM, NL_total, NI_total, NDJ,
      componentesR: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, v])),
      R1, R3, F,
      RT1, RT3,
      conformeR1, conformeR3, conforme,
      patrimonioCultural: e.patrimonioCultural,
      memoria: mem,
      // Probabilidades finais (cenário COM as medidas de proteção configuradas
      // nesta análise) e fatores físicos intrínsecos (independentes de medidas
      // de proteção — características da estrutura/linha). Expostos aqui para
      // reaproveitamento pelo módulo de R4 (Anexo D), que precisa recalcular
      // as mesmas probabilidades no cenário "sem proteção" (PB=PSPD=PEB=1)
      // sem duplicar a lógica de lookup já implementada nesta função.
      probabilidades: { PA, PB, PC, PM, PU, PV, PW, PZ },
      fatoresFisicos: { PTA, PTU, PLD, PLI, CLD, CLI, PMS },
    };

    a.resultado = resultado;
    return resultado;
  }

  function calc_AD_wrap(L, W, H) { return NEMAX_CALC.calc_AD(L, W, H); }
  function calc_AM_wrap(L, W) { return NEMAX_CALC.calc_AM(L, W); }

  return { executar };
})();

/* ============================================================
   calcularR4 — orquestração do Anexo D (R4, perda econômica) +
   avaliação de custo-benefício (D.2). Reaproveita integralmente os
   N (eventos perigosos) e os fatores físicos intrínsecos já calculados
   e expostos em a.resultado pelo motor de risco principal — não
   duplica nenhuma lógica de lookup de N ou de fatores físicos.

   Conforme D.1.1, R4 é informativo/opcional: não substitui nem altera
   a validação de R1/R3, que continua sendo o critério normativo de
   necessidade de proteção. Esta função só executa se
   a.economico.avaliar === true e a.resultado já existir.
   ============================================================ */
function calcularR4(a) {
  if (!a.economico || !a.economico.avaliar) return null;
  if (!a.resultado || !a.resultado.probabilidades) return null;

  const econ = a.economico;
  const r = a.resultado;
  const f = a.fontesDano || {};
  const fat = r.fatoresFisicos;
  const probComProtecao = r.probabilidades;

  const ca = parseFloat(econ.ca) || 0;
  const cb = parseFloat(econ.cb) || 0;
  const cc = parseFloat(econ.cc) || 0;
  const cs = parseFloat(econ.cs) || 0;
  const modoSimplificado = !!econ.modoSimplificado;
  // No modo simplificado, R4 em si não depende de ct (as relações já são 1
  // por definição — D.1, nota da Tabela D.1), mas a avaliação de custo-
  // benefício em R$ (D.2) sempre precisa de um valor total real. Por isso
  // usa-se um campo único (ctSimplificado) nesse modo, em vez da soma
  // detalhada ca+cb+cc+cs (que só faz sentido no modo completo, por zona).
  const ct = modoSimplificado ? (parseFloat(econ.ctSimplificado) || 0) : (ca + cb + cc + cs);

  if (ct <= 0 && !modoSimplificado) return null; // sem valores monetários, modo completo não pode calcular

  const lfItem = NEMAX_CALC_R4.TABELA_D2_L4.LF[parseInt(econ.lfCategoria)];
  const loItem = NEMAX_CALC_R4.TABELA_D2_L4.LO[parseInt(econ.loCategoria)];
  if (!lfItem || !loItem) return null; // categorias de perda ainda não selecionadas

  const LT = NEMAX_CALC_R4.TABELA_D2_L4.LT[0].value;
  const LF = lfItem.value;
  const LO = loItem.value;

  // Fatores físicos intrínsecos da estrutura/linha (rt, rp, rf, hz) — os
  // mesmos usados no cálculo de R1, lidos do Módulo 2 (não dependem de
  // medidas de proteção, por isso são idênticos nos cenários com/sem proteção)
  const e = a.estrutura || {};
  const rt = e.tipoSuperficie, rp = e.providenciasIncendio, rf = e.riscoIncendio;

  // --- Perdas L4 (Tabela D.1) ---
  const LA4 = NEMAX_CALC_R4.calc_LA4_LU4(rt, LT, ca, ct, modoSimplificado);
  const LB4 = NEMAX_CALC_R4.calc_LB4_LV4(rp, rf, LF, ca, cb, cc, cs, ct, modoSimplificado);
  const LC4 = NEMAX_CALC_R4.calc_LC4_LM4_LW4_LZ4(LO, cs, ct, modoSimplificado);

  // --- Cenário COM proteção (probabilidades já calculadas pela análise atual) ---
  function montarComponentes(prob) {
    const comp = {};
    if (f.S1) {
      if (econ.temAnimaisComerciais) comp.RA4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PA, LA4.value, "RA4", "Eq. (D.1)");
      comp.RB4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PB, LB4.value, "RB4", "Eq. (D.3)");
      comp.RC4 = NEMAX_CALC_R4.calc_R4_componente(r.ND, prob.PC, LC4.value, "RC4", "Eq. (D.4)");
    }
    if (f.S2) {
      comp.RM4 = NEMAX_CALC_R4.calc_R4_componente(r.NM, prob.PM, LC4.value, "RM4", "Eq. (D.4)");
    }
    if (f.S3) {
      const NLDJ = r.NL_total + r.NDJ;
      if (econ.temAnimaisComerciais) comp.RU4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PU, LA4.value, "RU4", "Eq. (D.1)/(D.2)");
      comp.RV4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PV, LB4.value, "RV4", "Eq. (D.3)");
      comp.RW4 = NEMAX_CALC_R4.calc_R4_componente(NLDJ, prob.PW, LC4.value, "RW4", "Eq. (D.4)");
    }
    if (f.S4) {
      comp.RZ4 = NEMAX_CALC_R4.calc_R4_componente(r.NI_total, prob.PZ, LC4.value, "RZ4", "Eq. (D.4)");
    }
    return comp;
  }

  const componentesCom = montarComponentes(probComProtecao);
  const R4_com = NEMAX_CALC_R4.calc_R4_total(componentesCom);

  // --- Cenário SEM proteção: PB=PSPD=PEB=1, mantendo os fatores físicos
  // intrínsecos (PTA, PTU, PLD, PLI, CLD, CLI, PMS) idênticos, já que estes
  // não são "medidas de proteção a instalar", são características fixas da
  // estrutura/linha conectada.
  const probSemProtecao = {
    PA: fat.PTA * 1,
    PB: 1,
    PC: 1 * fat.CLD,
    PM: 1 * fat.PMS,
    PU: fat.PTU * 1 * fat.PLD * fat.CLD,
    PV: 1 * fat.PLD * fat.CLD,
    PW: 1 * fat.PLD * fat.CLD,
    PZ: 1 * fat.PLI * fat.CLI,
  };
  const componentesSem = montarComponentes(probSemProtecao);
  const R4_sem = NEMAX_CALC_R4.calc_R4_total(componentesSem);

  const resultado = { ct, ca, cb, cc, cs, modoSimplificado, LA4, LB4, LC4, lfItem, loItem, R4_com, R4_sem, componentesCom, componentesSem };

  // --- Avaliação de custo-benefício (D.2), só se os campos de custo
  // estiverem preenchidos — é uma extensão opcional dentro do já opcional R4 ---
  const CP = parseFloat(econ.custoProtecao);
  const i = parseFloat(econ.taxaJuros);
  const aTax = parseFloat(econ.taxaAmortizacao);
  const m = parseFloat(econ.taxaManutencao);
  if (!isNaN(CP) && !isNaN(i) && !isNaN(aTax) && !isNaN(m)) {
    const CL = NEMAX_CALC_R4.calc_CL(R4_sem.value, ct);
    const CRL = NEMAX_CALC_R4.calc_CRL(R4_com.value, ct);
    const CPM = NEMAX_CALC_R4.calc_CPM(CP, i, aTax, m);
    const SM = NEMAX_CALC_R4.calc_SM(CL.value, CPM.value, CRL.value);
    const justificativa = NEMAX_CALC_R4.avaliarJustificativaCusto(CL.value, CRL.value, CPM.value);
    Object.assign(resultado, { CL, CRL, CPM, SM, justificativa });
  }

  return resultado;
}

/* ============================================================
   MÓDULO 7 — RESULTADOS E COMPONENTES DE RISCO
   ============================================================ */

const M_Resultados = (function () {
  function render(a) {
    if (!a.resultado) {
      return `<div style="text-align:center; padding:60px 20px;">
        <p style="color:var(--gray-text); margin-bottom:16px;">Os resultados ainda não foram calculados para esta análise.</p>
        <button class="btn btn-primary" onclick="M_Resultados.calcular()">Calcular agora</button>
      </div>`;
    }
    const r = a.resultado;
    const e = a.estrutura;

    const r1Pct = Math.min(100, (r.R1 / r.RT1) * 100);
    const r3Pct = r.patrimonioCultural ? Math.min(100, (r.R3 / r.RT3) * 100) : 0;

    return `
      <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
        <button class="btn btn-secondary" onclick="M_Resultados.recalcular()">↻ Recalcular</button>
      </div>

      <div class="verdict-banner ${r.conforme ? "ok" : "fail"}">
        <div class="verdict-banner-label">Resultado da análise</div>
        <div class="verdict-banner-main">${r.conforme ? "Dentro do risco tolerável — proteção atual é suficiente" : "Acima do risco tolerável — medidas de proteção são necessárias"}</div>
        <div class="verdict-banner-detail">
          ${r.conforme
            ? "Conforme 5.4.3, os resultados obtidos são suficientes para os riscos avaliados, ressalvado o que a frequência de danos F possa exigir adicionalmente."
            : "Conforme 5.4.4, medidas de proteção devem ser adotadas até que R ≤ R_T para todos os tipos de risco aplicáveis."}
        </div>
      </div>

      <div class="risk-cards">
        <div class="risk-card">
          <div class="risk-card-head"><div class="risk-card-name">R1 — Perda de vida humana</div>
            <span class="pill ${r.conformeR1 ? "ok" : "fail"}">${r.conformeR1 ? "Conforme" : "Não conforme"}</span></div>
          <div class="risk-card-val">${fmtNum(r.R1)} /ano</div>
          <div class="risk-card-tol">R_T1 = ${fmtNum(r.RT1)} /ano · razão R1/R_T1 = ${fmtRazao(r.R1 / r.RT1)}</div>
          <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${r1Pct}%; background:${r.conformeR1 ? "var(--ok)" : "var(--fail)"}"></div></div>
        </div>
        <div class="risk-card">
          <div class="risk-card-head"><div class="risk-card-name">R3 — Perda de patrimônio cultural</div>
            <span class="pill ${r.patrimonioCultural ? (r.conformeR3 ? "ok" : "fail") : "pending"}">${r.patrimonioCultural ? (r.conformeR3 ? "Conforme" : "Não conforme") : "Não aplicável"}</span></div>
          <div class="risk-card-val">${r.patrimonioCultural ? fmtNum(r.R3) + " /ano" : "—"}</div>
          <div class="risk-card-tol">${r.patrimonioCultural ? `R_T3 = ${fmtNum(r.RT3)} /ano · razão = ${fmtRazao(r.R3 / r.RT3)}` : "Estrutura não indicada como patrimônio cultural"}</div>
          <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${r3Pct}%; background:${r.conformeR3 ? "var(--ok)" : "var(--fail)"}"></div></div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Áreas de exposição equivalente (Anexo A)</div>
        <div class="field-grid cols-3">
          ${miniStat("A_D", r.AD.toFixed(1) + " m²", "Eq. A.1")}
          ${miniStat("A_M", r.AM.toFixed(1) + " m²", "Eq. A.6")}
          ${miniStat("N_D", fmtNum(r.ND), "Eq. A.3")}
          ${miniStat("N_M", fmtNum(r.NM), "Eq. A.5")}
          ${miniStat("N_L (total linhas)", fmtNum(r.NL_total), "Eq. A.7")}
          ${miniStat("N_I (total linhas)", fmtNum(r.NI_total), "Eq. A.9")}
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Componentes de risco calculados (Tabela 6)</div>
        <div class="field-grid cols-3">
          ${Object.entries(r.componentesR).map(([k, v]) => miniStat(k.replace("R", "R_"), fmtNum(v), "")).join("")}
          ${Object.keys(r.componentesR).length === 0 ? "<p style='color:var(--gray-text); font-size:13px;'>Nenhum componente calculado — verifique as fontes de dano selecionadas no Módulo 5.</p>" : ""}
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">Frequência de danos F (Seção 7)</div>
        <div class="field-grid cols-3">
          ${miniStat("F (parcial — F_C+F_M+F_W+F_Z)", fmtNum(r.F), "Eq. 14/15")}
          ${miniStat("F_T crítico (fixo)", "0,1 /ano", "7.3.4")}
          ${miniStat("F_T não crítico", "1 /ano", "7.3.4")}
        </div>
        <p style="font-size:12px; color:var(--gray-text); margin-top:10px; line-height:1.6;">F_B (equipamento em ZPR0A) e a parcela de corrente direta F_V não estão incluídas — exigem avaliação específica por equipamento conforme 7.1.5.</p>
      </div>

      <div class="subsection">
        <div class="subsection-title">Medidas de proteção recomendadas (Tabela 3, Figura 1)</div>
        ${recomendacoes(a)}
      </div>

      ${renderSubsecaoR4(a)}
    `;
  }

  /* ============================================================
     UI — Subseção R4 (Anexo D, perda econômica) e custo-benefício.
     Informativa/opcional por definição normativa (D.1.1) — não
     altera R1/R3 nem o veredito de conformidade da análise.
     ============================================================ */
  function renderSubsecaoR4(a) {
    const econ = a.economico || (a.economico = novoEstadoEconomico());
    const LF_OPTS = NEMAX_CALC_R4.TABELA_D2_L4.LF;
    const LO_OPTS = NEMAX_CALC_R4.TABELA_D2_L4.LO;

    let corpo = `
      <div class="field-grid">
        <div class="field"><label>Avaliar R4 (perda de valor econômico)?</label>
          <select id="f-r4-avaliar">
            <option value="nao" ${!econ.avaliar ? "selected" : ""}>Não (padrão — R4 é informativo, D.1.1)</option>
            <option value="sim" ${econ.avaliar ? "selected" : ""}>Sim</option>
          </select>
        </div>
      </div>
    `;

    if (econ.avaliar) {
      corpo += `
        <div class="field-grid">
          <div class="field"><label>Modo de cálculo</label>
            <select id="f-r4-modo">
              <option value="simplificado" ${econ.modoSimplificado ? "selected" : ""}>Simplificado (relações = 1 — valor representativo RT4=10⁻³, D.1.2)</option>
              <option value="completo" ${!econ.modoSimplificado ? "selected" : ""}>Completo (valores monetários reais por zona, D.1.3)</option>
            </select>
          </div>
          <div class="field"><label>Risco de incêndio/danos físicos (L_F — Tabela D.2)</label>
            <select id="f-r4-lf">
              <option value="">Selecione...</option>
              ${LF_OPTS.map((o, i) => `<option value="${i}" ${econ.lfCategoria == i ? "selected" : ""}>${esc(o.label)} (L_F=${o.value})</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Falha de sistemas internos (L_O — Tabela D.2)</label>
            <select id="f-r4-lo">
              <option value="">Selecione...</option>
              ${LO_OPTS.map((o, i) => `<option value="${i}" ${econ.loCategoria == i ? "selected" : ""}>${esc(o.label)} (L_O=${o.value})</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Há animais com valor comercial?</label>
            <select id="f-r4-animais">
              <option value="nao" ${!econ.temAnimaisComerciais ? "selected" : ""}>Não</option>
              <option value="sim" ${econ.temAnimaisComerciais ? "selected" : ""}>Sim (habilita R_A4/R_U4, D.1.4)</option>
            </select>
          </div>
        </div>
      `;

      if (!econ.modoSimplificado) {
        corpo += `
          <div class="field-grid cols-3">
            <div class="field"><label>Valor dos animais c_a (R$)</label><input type="number" step="1000" id="f-r4-ca" value="${esc(econ.ca)}"></div>
            <div class="field"><label>Valor da edificação c_b (R$)</label><input type="number" step="1000" id="f-r4-cb" value="${esc(econ.cb)}"></div>
            <div class="field"><label>Valor do conteúdo c_c (R$)</label><input type="number" step="1000" id="f-r4-cc" value="${esc(econ.cc)}"></div>
            <div class="field"><label>Valor dos sistemas internos c_s (R$)</label><input type="number" step="1000" id="f-r4-cs" value="${esc(econ.cs)}"></div>
          </div>
        `;
      } else {
        corpo += `
          <div class="field-grid">
            <div class="field"><label>Valor total da estrutura c_t (R$) — opcional</label>
              <input type="number" step="1000" id="f-r4-ct-simpl" value="${esc(econ.ctSimplificado)}">
              <span class="hint">No modo simplificado, R4 não depende deste valor (relações já são 1) — só é necessário para calcular custos em R$ na avaliação de custo-benefício (D.2) abaixo.</span>
            </div>
          </div>
        `;
      }

      const r4 = calcularR4(a);
      if (r4) {
        corpo += `
          <div style="margin-top:14px; padding:14px 16px; border-radius:6px; background:var(--gray-light); border:1px solid var(--line);">
            <div class="field-grid cols-3">
              ${miniStat("R4 (com proteção atual)", fmtNum(r4.R4_com.value), "D.1.4")}
              ${miniStat("R4 (sem nenhuma proteção)", fmtNum(r4.R4_sem.value), "D.1.4")}
              ${miniStat("c_t (valor total)", "R$ " + r4.ct.toLocaleString("pt-BR"), "D.1.3")}
            </div>
            <p style="font-size:11px; color:var(--gray-text); margin-top:8px;">R4 é informativo (D.1.1) — não altera o veredito de conformidade R1/R3 desta análise. RT4 representativo = ${NEMAX_CALC_R4.RT4_REPRESENTATIVO.toExponential(0)} (D.1.2, não normalizado).</p>
          </div>

          <div class="subsection" style="margin-top:16px;">
            <div class="subsection-title">Avaliação do custo da eficiência da proteção (D.2) — opcional</div>
            <div class="field-grid cols-3">
              <div class="field"><label>Custo das medidas de proteção CP (R$)</label><input type="number" step="100" id="f-r4-cp" value="${esc(econ.custoProtecao)}"></div>
              <div class="field"><label>Taxa de juros i (decimal, ex: 0,05)</label><input type="number" step="0.001" id="f-r4-i" value="${esc(econ.taxaJuros)}"></div>
              <div class="field"><label>Taxa de amortização a (decimal)</label><input type="number" step="0.001" id="f-r4-a" value="${esc(econ.taxaAmortizacao)}"></div>
              <div class="field"><label>Taxa de manutenção m (decimal)</label><input type="number" step="0.001" id="f-r4-m" value="${esc(econ.taxaManutencao)}"></div>
            </div>
        `;
        if (r4.CL) {
          const cor = r4.justificativa.justificado ? "var(--ok)" : "var(--fail)";
          const bg = r4.justificativa.justificado ? "var(--ok-bg)" : "var(--fail-bg)";
          corpo += `
            <div style="margin-top:12px; padding:12px 16px; border-radius:6px; background:${bg}; border:1px solid ${cor};">
              <div class="field-grid cols-3">
                ${miniStat("CL (custo sem proteção)", "R$ " + r4.CL.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 }), "Eq. D.8")}
                ${miniStat("CRL (custo residual com proteção)", "R$ " + r4.CRL.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 }), "Eq. D.10")}
                ${miniStat("CPM (custo anual da proteção)", "R$ " + r4.CPM.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 }), "Eq. D.11")}
              </div>
              <div style="margin-top:10px; font-weight:700; color:${cor};">
                ${r4.justificativa.justificado ? "✓" : "⚠"} SM = R$ ${r4.SM.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} — ${esc(r4.justificativa.mensagem)}
              </div>
            </div>
          `;
        } else {
          corpo += `<p style="font-size:11.5px; color:var(--gray-text); margin-top:8px;">Preencha CP, i, a e m para calcular o custo-benefício da proteção (Eq. D.7-D.12).</p>`;
        }
        corpo += `</div>`;
      } else {
        corpo += `<p style="font-size:11.5px; color:var(--gray-text); margin-top:8px;">Selecione as categorias de L_F e L_O${!econ.modoSimplificado ? ", e informe os valores monetários," : ""} para calcular R4.</p>`;
      }
    }

    return `
      <div class="subsection">
        <div class="subsection-title">Risco de perda de valor econômico — R4 (Anexo D, informativo)</div>
        ${corpo}
      </div>
    `;
  }

  function miniStat(label, val, norma) {
    return `<div class="risk-card" style="padding:12px 14px;">
      <div style="font-size:11.5px; color:var(--gray-text); margin-bottom:4px;">${label}</div>
      <div style="font-family:'Courier New',monospace; font-weight:700; font-size:14px; color:var(--navy);">${val}</div>
      ${norma ? `<div style="font-size:10px; color:var(--copper); margin-top:2px;">${norma}</div>` : ""}
    </div>`;
  }

  function recomendacoes(a) {
    const r = a.resultado;
    if (r.conforme) {
      return `<div class="protection-card"><div class="protection-card-title">Nenhuma medida adicional obrigatória pelos componentes R1/R3</div>
        <div class="protection-card-desc">Os riscos avaliados estão dentro do limite tolerável com as medidas de proteção informadas. Reavalie se houver mudança de uso, ocupação ou geometria da edificação.</div></div>`;
    }
    const recs = [];
    const c = r.componentesR;
    if ((c.RA || 0) + (c.RB || 0) >= 0 && !r.conformeR1) {
      recs.push({ titulo: "SPDA (Nível de Proteção)", desc: "Reduz P_B e, em consequência, R_B e R_A. Considere elevar o NP do SPDA (reduz P_B conforme Tabela B.2) ou instalar SPDA caso inexistente.", norma: "Tabela 3; Anexo B.3" });
      recs.push({ titulo: "Ligação equipotencial / restrições físicas", desc: "Reduz P_TA e, portanto, R_A — útil isoladamente se R_A+R_B < R_T (nota 'a' da Figura 1), podendo dispensar a necessidade de PDA conforme ABNT NBR 5419-3.", norma: "Figura 1, nota a" });
    }
    if (c.RC || c.RM || c.RW || c.RZ) {
      recs.push({ titulo: "Sistema coordenado de DPS", desc: "Reduz P_C, P_M, P_W, P_Z (via P_SPD). Essencial quando há sistemas internos críticos ou risco de explosão.", norma: "Tabela 3; Anexo B.4" });
      recs.push({ titulo: "Blindagem espacial / roteamento de cabos", desc: "Reduz P_MS (via K_S1, K_S2, K_S3) e, portanto, R_M.", norma: "Tabela 3; B.4.10-B.4.14" });
    }
    if (c.RU || c.RV || c.RW) {
      recs.push({ titulo: "DPS classe I na entrada das linhas / blindagem de linha", desc: "Reduz P_EB, P_LD (via C_LD) e, portanto, R_U, R_V, R_W.", norma: "Tabela 3; Anexo B.5-B.7" });
    }
    if (recs.length === 0) {
      recs.push({ titulo: "Revisão da análise recomendada", desc: "R1 ou R3 excedem o limite tolerável, mas nenhuma componente isolada foi identificada automaticamente — revise os dados de entrada.", norma: "5.4.4" });
    }
    return recs.map((x) => `<div class="protection-card">
      <div class="protection-card-title">${x.titulo}</div>
      <div class="protection-card-desc">${x.desc}</div>
      <div class="protection-card-norma">${x.norma}</div>
    </div>`).join("");
  }

  function calcular() {
    const a = App.getCurrentAnalise();
    Calculo.executar(a);
    salvarAnalise(a);
    App.render();
    App.showToast("Resultados calculados.");
  }
  function recalcular() { calcular(); }

  function bind(a) {
    // Os campos de R4 (.f-r4-*) aparecem/desaparecem condicionalmente
    // (avaliar=sim/não, modo simplificado/completo) — mesmo padrão de
    // re-render em change já usado em M_DimensionamentoSPDA/M_Protecoes/
    // M_Estrutura, necessário para o painel refletir o estado atualizado
    // sem esperar o usuário avançar de módulo.
    const idsRerender = [
      "f-r4-avaliar", "f-r4-modo", "f-r4-lf", "f-r4-lo", "f-r4-animais",
      "f-r4-ca", "f-r4-cb", "f-r4-cc", "f-r4-cs", "f-r4-ct-simpl",
      "f-r4-cp", "f-r4-i", "f-r4-a", "f-r4-m",
    ];
    idsRerender.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        coletar(a);
        salvarAnalise(a);
        App.render();
      });
    });
  }

  function coletar(a) {
    if (!a.economico) a.economico = novoEstadoEconomico();
    const g = (id) => { const el = document.getElementById(id); return el ? el.value : undefined; };
    const econ = a.economico;
    if (g("f-r4-avaliar") !== undefined) econ.avaliar = g("f-r4-avaliar") === "sim";
    if (g("f-r4-modo") !== undefined) econ.modoSimplificado = g("f-r4-modo") === "simplificado";
    if (g("f-r4-lf") !== undefined) econ.lfCategoria = g("f-r4-lf");
    if (g("f-r4-lo") !== undefined) econ.loCategoria = g("f-r4-lo");
    if (g("f-r4-animais") !== undefined) econ.temAnimaisComerciais = g("f-r4-animais") === "sim";
    if (g("f-r4-ca") !== undefined) econ.ca = g("f-r4-ca");
    if (g("f-r4-cb") !== undefined) econ.cb = g("f-r4-cb");
    if (g("f-r4-cc") !== undefined) econ.cc = g("f-r4-cc");
    if (g("f-r4-cs") !== undefined) econ.cs = g("f-r4-cs");
    if (g("f-r4-ct-simpl") !== undefined) econ.ctSimplificado = g("f-r4-ct-simpl");
    if (g("f-r4-cp") !== undefined) econ.custoProtecao = g("f-r4-cp");
    if (g("f-r4-i") !== undefined) econ.taxaJuros = g("f-r4-i");
    if (g("f-r4-a") !== undefined) econ.taxaAmortizacao = g("f-r4-a");
    if (g("f-r4-m") !== undefined) econ.taxaManutencao = g("f-r4-m");
  }

  return { render, bind, coletar, calcular, recalcular };
})();


/* ============================================================
   MÓDULO 8 — MEMÓRIA DE CÁLCULO COMPLETA
   ============================================================ */

const M_Memoria = (function () {
  const GRUPOS = [
    { id: "areas", label: "Áreas de exposição equivalente (Anexo A)" },
    { id: "eventos", label: "Número de eventos perigosos N (Anexo A)" },
    { id: "probabilidades", label: "Probabilidades de dano P (Anexo B)" },
    { id: "perdas", label: "Quantidade de perda L (Anexo C)" },
    { id: "componentes", label: "Componentes de risco R (Seção 6)" },
    { id: "risco_final", label: "Risco total R1 / R3 (Seção 4.3, 5.3)" },
    { id: "frequencia", label: "Frequência de danos F (Seção 7)" },
  ];

  function render(a) {
    if (!a.resultado) {
      return `<p style="color:var(--gray-text);">Calcule os resultados no Módulo 7 para gerar a memória de cálculo.</p>`;
    }
    const mem = a.resultado.memoria;
    return `
      <p style="font-size:12.5px; color:var(--gray-text); margin-bottom:18px;">
        Toda fórmula, parâmetro, coeficiente e substituição numérica utilizada nesta análise,
        com referência ao item exato da ABNT NBR 5419-2:2026. Nenhum cálculo intermediário foi omitido.
      </p>
      ${GRUPOS.map((g) => {
        const items = mem.filter((m) => m.grupo === g.id);
        if (items.length === 0) return "";
        return `
          <div class="calc-memory-group-title">${g.label}</div>
          <table class="calc-memory-table">
            <thead><tr><th style="width:28%">Fórmula</th><th style="width:18%">Referência normativa</th><th>Substituição numérica</th></tr></thead>
            <tbody>
              ${items.map((m) => `<tr>
                <td>${esc(m.formula)}${m.item ? `<br><span style="color:var(--gray-text); font-size:10.5px;">${esc(m.item)}</span>` : ""}</td>
                <td class="cm-norma">${esc(m.norma)}</td>
                <td class="cm-sub">${esc(m.substituicao)}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        `;
      }).join("")}
      <div style="margin-top:24px;">
        <button class="btn btn-secondary" onclick="M_Memoria.exportar()">Exportar memória de cálculo (JSON)</button>
      </div>
    `;
  }

  function exportar() {
    const a = App.getCurrentAnalise();
    if (!a.resultado) return;
    downloadJSON(a.resultado.memoria, `memoria-calculo-${a.id}.json`);
  }

  function bind() {}
  function coletar() {}

  return { render, bind, coletar, exportar };
})();


/* ============================================================
   MÓDULO 9 — RELATÓRIO TÉCNICO (impressão / PDF)
   ============================================================ */

const M_Relatorio = (function () {
  function render(a) {
    const pronto = !!a.resultado;
    return `
      <div style="text-align:center; padding:30px 20px;">
        ${!pronto ? `<p style="color:var(--gray-text); margin-bottom:20px;">Calcule os resultados (Módulo 7) antes de gerar o relatório.</p>` : `
        <p style="color:var(--gray-text); margin-bottom:24px; max-width:480px; margin-left:auto; margin-right:auto; line-height:1.6;">
          O relatório técnico completo será aberto na janela de impressão do navegador.
          Use "Salvar como PDF" no destino da impressão para gerar o arquivo final.
        </p>
        <button class="btn btn-primary" style="padding:14px 28px; font-size:15px;" onclick="M_Relatorio.gerar()">📄 Gerar relatório PDF</button>
        `}
      </div>
    `;
  }

  function gerar() {
    const a = App.getCurrentAnalise();
    if (!a.resultado) return;
    const cfg = getConfig();
    const html = montarRelatorio(a, cfg);
    const reportEl = document.getElementById("print-report");
    reportEl.innerHTML = html;
    // Corrige o problema de título de seção ficar sozinho no fim de uma
    // página, com seu conteúdo empurrado para a próxima — page-break-after
    // isolado em .report-h2 não é confiável no motor de paginação do
    // Chromium. Roda após o innerHTML ser setado (DOM já tem layout
    // calculado, necessário para a leitura de offsetHeight).
    evitarTitulosOrfaos(reportEl, 180);
    setTimeout(() => window.print(), 250);
  }

  function montarRelatorio(a, cfg) {
    const id = a.identificacao, e = a.estrutura, at = a.atmosferico, r = a.resultado;
    const dataHoje = new Date().toLocaleDateString("pt-BR");

    return `
    <div class="report-page">
      <div class="report-cover">
        <div class="report-cover-brand">NEMA<span class="x-accent">X</span></div>
        <div class="report-cover-tag">E N G E N H A R I A</div>
        <div class="report-cover-title">Laudo Técnico — Análise de Risco de Descargas Atmosféricas<br>ABNT NBR 5419-2:2026</div>
        <div class="report-cover-meta">
          Cliente: ${esc(id.cliente)}<br>
          Edificação: ${esc(id.endereco)}, ${esc(id.numero)} — ${esc(id.cidade)}/${esc(id.estado)}<br>
          Laudo nº: ${esc(id.numeroLaudo) || "—"} · ART nº: ${esc(id.numeroART) || "—"}<br>
          Data: ${esc(id.dataAnalise) || dataHoje}
        </div>
      </div>

      <div class="report-section">
        <div class="report-h2">1. Dados do cliente e da edificação</div>
        <table class="report-table report-table-compact">
          <tr><th>Cliente</th><td>${esc(id.cliente)}</td><th>Responsável</th><td>${esc(id.responsavel)}</td></tr>
          <tr><th>Endereço</th><td colspan="3">${esc(id.endereco)}, ${esc(id.numero)} ${esc(id.complemento)} — ${esc(id.bairro)}, ${esc(id.cidade)}/${esc(id.estado)} — CEP ${esc(id.cep)}</td></tr>
          <tr><th>Tipo de estrutura</th><td>${esc(e.tipo)}</td><th>Pavimentos</th><td>${esc(e.numPavimentos)}</td></tr>
          <tr><th>Dimensões (L×W×H)</th><td>${e.comprimento}×${e.largura}×${e.altura} m</td><th>Ocupantes</th><td>${e.numOcupantes}</td></tr>
        </table>

        <div class="report-h2">2. Dados atmosféricos</div>
        <table class="report-table report-table-compact">
          <tr><th>Município</th><td>${esc(at.municipio)} / ${esc(at.estado)}</td><th>N_G</th><td>${at.ng} raios/km²/ano</td></tr>
        </table>
        <p style="font-size:11.5px; color:#555;">Fonte: ABNT NBR 5419-2:2026, Tabela F.1 (Anexo F, normativo).${at.ngEditadoManualmente ? ` Valor sobrescrito manualmente (original da norma: ${at.ngOriginal}).` : ""}</p>

        <div class="report-h2">3. Resultado da análise de risco</div>
        <table class="report-table report-table-compact">
          <tr><th>Risco</th><th>Valor calculado</th><th>Limite tolerável (R_T)</th><th>Situação</th></tr>
          <tr>
            <td>R1 — Perda de vida humana</td><td>${fmtNum(r.R1)} /ano</td><td>${fmtNum(r.RT1)} /ano</td>
            <td><b style="color:${r.conformeR1 ? "#1f7a4d" : "#a3342a"}">${r.conformeR1 ? "CONFORME" : "NÃO CONFORME"}</b></td>
          </tr>
          <tr>
            <td>R3 — Perda de patrimônio cultural</td>
            <td>${r.patrimonioCultural ? fmtNum(r.R3) + " /ano" : "não aplicável"}</td>
            <td>${r.patrimonioCultural ? fmtNum(r.RT3) + " /ano" : "—"}</td>
            <td>${r.patrimonioCultural ? `<b style="color:${r.conformeR3 ? "#1f7a4d" : "#a3342a"}">${r.conformeR3 ? "CONFORME" : "NÃO CONFORME"}</b>` : "—"}</td>
          </tr>
        </table>

        <div class="report-h2">4. Parecer técnico conclusivo</div>
        <p style="font-size:11pt; line-height:1.6;">
          ${r.conforme
            ? "Com base nos parâmetros levantados e nos critérios da ABNT NBR 5419-2:2026, os riscos avaliados para a edificação encontram-se dentro do limite tolerável definido na Tabela 4 da norma. Não há, portanto, exigência normativa de novas medidas de proteção contra descargas atmosféricas além das já existentes, ressalvada a necessidade de reavaliação em caso de alteração de uso, ocupação ou geometria da edificação."
            : "Com base nos parâmetros levantados e nos critérios da ABNT NBR 5419-2:2026, os riscos avaliados para a edificação excedem o limite tolerável definido na Tabela 4 da norma. Conforme 5.4.4, medidas de proteção devem ser adotadas até que a condição R ≤ R_T seja satisfeita para todos os tipos de risco aplicáveis. As recomendações técnicas constam na Seção 5 deste laudo."}
        </p>

        <div class="report-h2">5. Recomendações técnicas</div>
        <div>${M_Resultados ? recomendacoesTexto(a) : ""}</div>

        ${secaoR4Relatorio(a)}

        <div class="report-h2">6. Dimensionamento físico do SPDA — ABNT NBR 5419-3:2026</div>
        ${secaoDimensionamentoRelatorio(a)}

        <div class="report-h2">7. Medidas de Proteção contra Surtos (MPS) — ABNT NBR 5419-4:2026</div>
        ${secaoMPSRelatorio(a)}

        <div class="report-h2">8. Memória de cálculo — análise de risco (ABNT NBR 5419-2:2026)</div>
        ${memoriaParaImpressao(r.memoria)}

        <div class="report-sig">
          ___________________________________<br>
          <b>${esc(cfg.responsavelTecnico)}</b><br>
          ${esc(cfg.crea)}<br>
          ${esc(cfg.empresa)} — ${esc(cfg.email)}<br>
          ART nº ${esc(id.numeroART) || "_______________"}<br>
          Data: ${dataHoje}
        </div>
      </div>
    </div>
    `;
  }

  function secaoR4Relatorio(a) {
    if (!a.economico || !a.economico.avaliar) return "";
    const r4 = calcularR4(a);
    if (!r4) return "";

    let html = `<div class="report-h2" style="margin-top:18px;">5B. Risco de perda de valor econômico — R4 (Anexo D, informativo)</div>
      <p style="font-size:12px; color:#555; margin-bottom:10px;">
        Conforme D.1.1 da ABNT NBR 5419-2:2026, o risco de perda de valor econômico (R4) é informativo e
        não é obrigatório para validar a necessidade da proteção contra descargas atmosféricas — essa
        validação permanece integralmente baseada em R1/R3 (Seções 3 e 4 deste laudo).
      </p>
      <table class="report-table">
        <tr><th>Indicador</th><th>Valor</th><th>Norma</th></tr>
        <tr><td>R4 — com a proteção atual da análise</td><td>${fmtNum(r4.R4_com.value)} /ano</td><td>D.1.4</td></tr>
        <tr><td>R4 — hipotético, sem nenhuma proteção</td><td>${fmtNum(r4.R4_sem.value)} /ano</td><td>D.1.4</td></tr>
        <tr><td>c_t — valor total da estrutura</td><td>R$ ${r4.ct.toLocaleString("pt-BR")}</td><td>D.1.3</td></tr>
        <tr><td>RT4 — risco tolerável representativo (não normalizado)</td><td>${NEMAX_CALC_R4.RT4_REPRESENTATIVO.toExponential(0)}</td><td>D.1.2</td></tr>
      </table>`;

    if (r4.CL) {
      const corTxt = r4.justificativa.justificado ? "#1f7a4d" : "#a3342a";
      html += `
        <p style="font-size:12.5px; font-weight:700; margin-top:14px;">Avaliação do custo da eficiência da proteção (D.2)</p>
        <table class="report-table">
          <tr><th>Indicador</th><th>Valor</th><th>Equação</th></tr>
          <tr><td>CL — custo anual de perdas sem proteção</td><td>R$ ${r4.CL.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td><td>Eq. (D.8)</td></tr>
          <tr><td>CRL — custo anual de perdas residuais com proteção</td><td>R$ ${r4.CRL.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td><td>Eq. (D.10)</td></tr>
          <tr><td>CPM — custo anual das medidas de proteção</td><td>R$ ${r4.CPM.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td><td>Eq. (D.11)</td></tr>
          <tr><td style="font-weight:700;">SM — valor econômico anual</td><td style="font-weight:700; color:${corTxt};">R$ ${r4.SM.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td><td>Eq. (D.12)</td></tr>
        </table>
        <p style="font-size:12px; color:${corTxt}; font-weight:700; margin-top:6px;">${esc(r4.justificativa.mensagem)}</p>
      `;
    }

    return html;
  }

  function secaoMPSRelatorio(a) {
    if (!a.mps) a.mps = novoEstadoMPS();
    if (!a.mps.avaliacoesCampo) a.mps.avaliacoesCampo = []; // retrocompat: análises salvas na Entrega 1
    const m = a.mps;
    if (m.zonasIdentificadas.length === 0 && m.pontosDPS.length === 0 && m.avaliacoesCampo.length === 0) {
      return `<p style="font-size:12.5px; color:#555;">Nenhuma Zona de Proteção contra Raio (ZPR), ponto de DPS coordenado ou avaliação de campo magnético foi cadastrado neste módulo.</p>`;
    }

    let html = "";

    // --- Avisos de verificação de consistência cruzada (MPS × análise de risco) ---
    const avisosConsist = verificarConsistenciaMPS(a);
    if (avisosConsist.length > 0) {
      const vermelhos = avisosConsist.filter((x) => x.nivel === "vermelho");
      const amarelos = avisosConsist.filter((x) => x.nivel === "amarelo");
      html += `<table class="report-table" style="margin-bottom:14px;">
        <tr><th colspan="2" style="background:${vermelhos.length ? "#a3342a" : "#b5651d"}; color:#fff;">
          VERIFICAÇÃO DE CONSISTÊNCIA (MPS × ANÁLISE DE RISCO) — ${avisosConsist.length} ${avisosConsist.length > 1 ? "ITENS IDENTIFICADOS" : "ITEM IDENTIFICADO"} NO MOMENTO DA EMISSÃO
        </th></tr>
        ${[...vermelhos, ...amarelos].map((x) => `<tr><td style="font-weight:700; color:${x.nivel === "vermelho" ? "#a3342a" : "#b5651d"}; width:30%;">${x.nivel === "vermelho" ? "⚠" : "ℹ"} ${esc(x.titulo)}</td><td style="font-size:11px;">${esc(x.mensagem)}</td></tr>`).join("")}
      </table>
      <p style="font-size:10.5px; color:#777; margin-top:-8px; margin-bottom:14px;">Verificação automática de consistência entre este módulo e o Módulo 6 (Proteções, NBR 5419-2); não substitui a revisão técnica do responsável. Registrada neste laudo para fins de rastreabilidade.</p>`;
    }

    // --- Memorial descritivo (texto corrido) ---
    html += `<div style="font-size:12.5px;">${gerarMemorialDescritivoMPS(a)}</div>`;

    // --- Tabela-resumo dos pontos de DPS verificados ---
    if (m.pontosDPS.length > 0) {
      html += `<p style="font-size:12.5px; font-weight:700; margin-top:18px;">Apêndice técnico — verificação dos pontos de DPS (Anexo C)</p>
      <table class="report-table">
        <tr><th>Ponto</th><th>Tipo</th><th>Up (kV)</th><th>ΔU (kV)</th><th>Up/f (kV)</th><th>Uw (kV)</th><th>Situação</th></tr>
        ${m.pontosDPS.map((p) => {
          const r = M_MPS.calcularPontoDPS(p);
          if (!r) return `<tr><td>${esc(p.nome) || "—"}</td><td colspan="6" style="color:#a3342a;">Dados insuficientes para verificação</td></tr>`;
          const cond = r.protecao.condicaoSatisfeita ? `Protegido (${r.protecao.condicaoSatisfeita.toUpperCase()})` : "NÃO PROTEGIDO";
          const cor = r.protecao.protegido ? "#1f7a4d" : "#a3342a";
          return `<tr>
            <td>${esc(p.nome) || "—"}</td>
            <td>${p.tipoDPS === "comutador" ? "Comutador" : "Limitador"}</td>
            <td>${r.up.toFixed(2)}</td>
            <td>${r.deltaU.value.toFixed(2)}</td>
            <td>${r.upF.value.toFixed(3)}</td>
            <td>${r.uw.toFixed(2)}</td>
            <td style="font-weight:700; color:${cor};">${cond}</td>
          </tr>`;
        }).join("")}
      </table>
      <p style="font-size:10.5px; color:#777; margin-top:6px;">Verificação conforme ABNT NBR 5419-4:2026, Anexo C, condições C.2.1.9-a) a d). Up/f obtido conforme C.2.1.3; ΔU estimado conforme NOTA de C.2.1.4 quando não informado pelo fabricante/projeto.</p>`;
    }

    // --- Tabela-resumo das avaliações de campo magnético (Anexo A.4/A.5) ---
    if (m.avaliacoesCampo.length > 0) {
      html += `<p style="font-size:12.5px; font-weight:700; margin-top:18px;">Apêndice técnico — campo magnético e blindagem (Anexo A.4)</p>
      <table class="report-table">
        <tr><th>Avaliação</th><th>Cenário</th><th>SF (dB)</th><th>H1/F/MÁX (A/m)</th><th>H1/FN/MÁX (A/m)</th><th>H1/S/MÁX (A/m)</th><th>Afastamento ds (m)</th></tr>
        ${m.avaliacoesCampo.map((c) => {
          const r = M_MPS.calcularAvaliacaoCampo(a, c);
          if (!r) return `<tr><td>${esc(c.nome) || "—"}</td><td colspan="6" style="color:#a3342a;">Dados insuficientes para verificação</td></tr>`;
          return `<tr>
            <td>${esc(c.nome) || "—"}</td>
            <td>${c.cenario === "direto" ? "Impacto direto" : "Impacto próximo"}</td>
            <td>${r.SF.value.toFixed(2)}</td>
            <td>${r.H1_F.value.toFixed(1)}</td>
            <td>${r.H1_FN.value.toFixed(1)}</td>
            <td>${r.H1_S.value.toFixed(1)}</td>
            <td>${r.ds.value.toFixed(3)}</td>
          </tr>`;
        }).join("")}
      </table>
      <p style="font-size:10.5px; color:#777; margin-top:6px;">Campo magnético calculado conforme ABNT NBR 5419-4:2026, Anexo A.4 (impacto direto: equações A.1-A.6; impacto próximo: equações A.7-A.16), com parâmetros de corrente da ABNT NBR 5419-1:2026, Tabela 3.</p>`;

      const comInducao = m.avaliacoesCampo.filter((c) => c.calcularInducao);
      if (comInducao.length > 0) {
        html += `<p style="font-size:12.5px; font-weight:700; margin-top:14px;">Tensões e correntes induzidas (Anexo A.5)</p>
        <table class="report-table">
          <tr><th>Avaliação</th><th>Componente</th><th>Uoc/máx (V)</th><th>Isc/máx (A)</th></tr>
          ${comInducao.map((c) => {
            const r = M_MPS.calcularAvaliacaoCampo(a, c);
            if (!r || !r.UOC_F) return "";
            return `
              <tr><td rowspan="3">${esc(c.nome) || "—"}</td><td>1ª positiva</td><td>${r.UOC_F.value.toFixed(1)}</td><td>${r.ISC_F.value.toFixed(2)}</td></tr>
              <tr><td>1ª negativa</td><td>${r.UOC_FN.value.toFixed(1)}</td><td>${r.ISC_FN.value.toFixed(2)}</td></tr>
              <tr><td>Subsequente</td><td>${r.UOC_S.value.toFixed(1)}</td><td>${r.ISC_S.value.toFixed(2)}</td></tr>
            `;
          }).join("")}
        </table>
        <p style="font-size:10.5px; color:#777; margin-top:6px;">Tensões e correntes induzidas calculadas conforme ABNT NBR 5419-4:2026, Anexo A.5 (equações A.22-A.32, impacto direto; A.37-A.42, campo homogêneo/impacto próximo).</p>`;
      }
    }

    return html;
  }

  function secaoDimensionamentoRelatorio(a) {
    const NP = a.protecoes ? a.protecoes.npSpda : "nenhum";
    if (NP === "nenhum" || !a.dimensionamento) {
      return `<p style="font-size:12.5px; color:#555;">Nenhum Nível de Proteção de SPDA foi definido na análise de risco; o dimensionamento físico não foi realizado.</p>`;
    }
    const d = a.dimensionamento;
    const tab2 = NEMAX_CALC_P3.tabelas.TABELA2_NP[NP];
    const linhasMemoria = [];
    const addMem = (r) => { if (r && r.formula) linhasMemoria.push(r); };

    // --- Avisos de verificação de consistência, se houver (registrados no laudo) ---
    let html = "";
    const avisosConsist = verificarConsistencia(a);
    if (avisosConsist.length > 0) {
      const vermelhos = avisosConsist.filter((x) => x.nivel === "vermelho");
      const amarelos = avisosConsist.filter((x) => x.nivel === "amarelo");
      html += `<table class="report-table" style="margin-bottom:14px;">
        <tr><th colspan="2" style="background:${vermelhos.length ? "#a3342a" : "#b5651d"}; color:#fff;">
          VERIFICAÇÃO DE CONSISTÊNCIA — ${avisosConsist.length} ${avisosConsist.length > 1 ? "ITENS IDENTIFICADOS" : "ITEM IDENTIFICADO"} NO MOMENTO DA EMISSÃO
        </th></tr>
        ${[...vermelhos, ...amarelos].map((x) => `<tr><td style="font-weight:700; color:${x.nivel === "vermelho" ? "#a3342a" : "#b5651d"}; width:30%;">${x.nivel === "vermelho" ? "⚠" : "ℹ"} ${esc(x.titulo)}</td><td style="font-size:11px;">${esc(x.mensagem)}</td></tr>`).join("")}
      </table>
      <p style="font-size:10.5px; color:#777; margin-top:-8px; margin-bottom:14px;">Verificação automática de consistência entre os dados informados nos diferentes módulos da análise; não substitui a revisão técnica do responsável. Registrada neste laudo para fins de rastreabilidade.</p>`;
    }

    // --- Memorial descritivo (texto corrido) ---
    html += `<div style="font-size:12.5px;">${gerarMemorialDescritivo(a)}</div>`;

    // --- Desenho esquemático ---
    const svg = gerarDesenhoEsquematico(a);
    if (svg) {
      html += `<div style="margin:14px 0;">${svg}</div>
        <p style="font-size:10.5px; color:#777; margin-top:-6px; margin-bottom:14px;">Esquema de apoio à visualização (posições de descida distribuídas uniformemente no perímetro); não substitui o projeto executivo georreferenciado.</p>`;
    }

    // --- Quantitativo de materiais ---
    const quantHtml = renderQuantitativoMateriais(a);
    if (quantHtml && !quantHtml.includes("Preencha os campos")) {
      html += `<p style="font-size:12.5px; font-weight:700; margin-top:14px;">Quantitativo estimado de materiais</p>${quantHtml}`;
    }

    // --- Dados resumidos + memória de cálculo numérica detalhada (apêndice técnico) ---
    html += `<p style="font-size:12.5px; font-weight:700; margin-top:18px;">Apêndice técnico — parâmetros e memória de cálculo</p>
    <table class="report-table">
      <tr><th>Nível de Proteção (NP)</th><td>${esc(NP)}</td><th>Raio da esfera rolante</th><td>${tab2.raioEsfera} m</td></tr>
      <tr><th>Módulo de malha máximo</th><td>${tab2.malhaLabel} m</td><th>Distância entre descidas (Tabela 5)</th><td>${NEMAX_CALC_P3.tabelas.TABELA5_DIST_DESCIDA[NP]} m</td></tr>
    </table>`;

    // Captação
    if (d.metodoCaptacao === "angulo" && d.alturaCaptor) {
      const rAng = NEMAX_CALC_P3.calc_anguloProtecao(NP, parseFloat(d.alturaCaptor));
      addMem(rAng);
      if (rAng.aplicavel) {
        html += `<p style="font-size:12.5px;"><b>Captação (método do ângulo de proteção):</b> para H = ${esc(d.alturaCaptor)} m, α ≈ ${rAng.value.toFixed(1)}°, raio de proteção na base ≈ ${rAng.raioProtecaoBase.toFixed(2)} m.</p>`;
      } else {
        html += `<p style="font-size:12.5px;"><b>Captação:</b> ${esc(rAng.substituicao)}</p>`;
      }
    } else {
      html += `<p style="font-size:12.5px;"><b>Captação:</b> método ${d.metodoCaptacao === "esfera" ? "da esfera rolante" : "das malhas"} — ${d.metodoCaptacao === "esfera" ? `raio R = ${tab2.raioEsfera} m` : `módulo máximo ${tab2.malhaLabel} m`} (Tabela 2, NP ${NP}).</p>`;
    }

    // Descida
    if (d.perimetroEstrutura && !d.descidaIsolada) {
      const rDesc = NEMAX_CALC_P3.calc_numeroMinDescidas(parseFloat(d.perimetroEstrutura), NP);
      const rEsp = NEMAX_CALC_P3.calc_espacamentoReal(parseFloat(d.perimetroEstrutura), rDesc.value);
      addMem(rDesc); addMem(rEsp);
      html += `<p style="font-size:12.5px;"><b>Descida:</b> perímetro de ${esc(d.perimetroEstrutura)} m → ${rDesc.value} condutores de descida, espaçamento real de ${rEsp.value.toFixed(2)} m.</p>`;
    }

    // Aterramento
    if (d.resistividadeSolo) {
      const rl1 = NEMAX_CALC_P3.calc_comprimentoMinEletrodo(NP, parseFloat(d.resistividadeSolo));
      addMem(rl1);
      html += `<p style="font-size:12.5px;"><b>Aterramento:</b> resistividade do solo ρ = ${esc(d.resistividadeSolo)} Ω·m → comprimento mínimo do eletrodo l1 = ${rl1.value.toFixed(2)} m.</p>`;
      if (d.areaEletrodo) {
        const rRe = NEMAX_CALC_P3.calc_raioEquivalenteEletrodo(parseFloat(d.areaEletrodo));
        const rDisp = NEMAX_CALC_P3.calc_dispensaComplementacao(rRe.value, rl1.value);
        addMem(rRe); addMem(rDisp);
        html += `<p style="font-size:12.5px;">Área do eletrodo informada: ${esc(d.areaEletrodo)} m² → raio equivalente re = ${rRe.value.toFixed(2)} m. Complementação do eletrodo: <b>${rDisp.value ? "DISPENSADA" : "NECESSÁRIA"}</b>.</p>`;
        if (!rDisp.value) {
          const comp = NEMAX_CALC_P3.calc_eletrodoComplementar(rRe.value, rl1.value);
          addMem(comp.lr); addMem(comp.lv);
          html += `<p style="font-size:12.5px;">Complementação sugerida por condutor de descida: eletrodo radial lr = ${comp.lr.value.toFixed(2)} m, ou eletrodo vertical lv = ${comp.lv.value.toFixed(2)} m.</p>`;
        }
      }
    }

    // Distância de segurança
    if (d.sComprimentoL) {
      const ki = NEMAX_CALC_P3.tabelas.TABELA11_KI[NP];
      const km = NEMAX_CALC_P3.tabelas.TABELA12_KM[d.meioIsolacao];
      const h = parseFloat(d.kcH), c = parseFloat(d.kcC), n = parseInt(d.kcN), l = parseFloat(d.sComprimentoL);
      let rKc = null;
      if (d.casoKc === "1") rKc = NEMAX_CALC_P3.calc_kc_umaDescida();
      else if (d.casoKc === "2" && h && c) rKc = NEMAX_CALC_P3.calc_kc_duasDescidas(h, c);
      else if (d.casoKc === "3central" && h && c) rKc = NEMAX_CALC_P3.calc_kc_tresDescidasCentral(h, c);
      else if (d.casoKc === "multiplas" && h && c && n) rKc = NEMAX_CALC_P3.calc_kc_multiplasDescidas(n, c, h);
      else if (d.casoKc === "tabela13" && n) rKc = NEMAX_CALC_P3.tabela13_kc(n);
      else if (d.casoKc === "manual" && d.kcManual) rKc = { value: parseFloat(d.kcManual), formula: "kc informado manualmente pelo responsável técnico", norma: "Procedimento gráfico do Anexo C (Fig. C.6, C.8 ou C.9) aplicado externamente" };
      if (rKc && rKc.value != null) {
        const rS = NEMAX_CALC_P3.calc_distanciaSeguranca_simplificada(NP, d.meioIsolacao, rKc.value, l);
        addMem(rKc); addMem(rS);
        html += `<p style="font-size:12.5px;"><b>Distância de segurança:</b> kc = ${rKc.value.toFixed(3)} (${esc(rKc.norma)}), l = ${esc(d.sComprimentoL)} m, ki = ${ki}, km = ${km} → s = ${rS.value.toFixed(3)} m.</p>`;
      }
    }

    if (linhasMemoria.length > 0) {
      html += `<table class="report-table" style="margin-top:10px;">
        <tr><th colspan="3" style="background:#1b2a4a; color:#fff;">MEMÓRIA DE CÁLCULO — DIMENSIONAMENTO FÍSICO (NBR 5419-3)</th></tr>
        <tr><th>Fórmula</th><th>Norma</th><th>Substituição</th></tr>
        ${linhasMemoria.map((m) => `<tr><td>${esc(m.formula)}</td><td style="font-family:monospace; font-size:10px;">${esc(m.norma)}</td><td style="font-family:monospace; font-size:10.5px;">${esc(m.substituicao)}</td></tr>`).join("")}
      </table>`;
    }

    return html;
  }

  function recomendacoesTexto(a) {
    const r = a.resultado;
    if (r.conforme) return `<p style="font-size:13px;">Nenhuma medida adicional obrigatória pelos componentes de risco avaliados.</p>`;
    const c = r.componentesR;
    const items = [];
    if (c.RA || c.RB) items.push("Elevação do Nível de Proteção do SPDA ou instalação de SPDA (reduz P_B, Tabela B.2).");
    if (c.RC || c.RM || c.RW || c.RZ) items.push("Instalação de sistema coordenado de DPS (reduz P_SPD, Tabela B.3).");
    if (c.RU || c.RV || c.RW) items.push("DPS classe I na entrada das linhas elétricas e/ou blindagem de linha (reduz P_EB e C_LD, Tabelas B.4 e B.7).");
    if (items.length === 0) items.push("Revisão dos dados de entrada recomendada.");
    return `<ul style="font-size:13px; padding-left:18px; line-height:1.8;">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  }

  function memoriaParaImpressao(mem) {
    const grupos = {};
    mem.forEach((m) => { (grupos[m.grupo] = grupos[m.grupo] || []).push(m); });
    return Object.entries(grupos).map(([g, items]) => `
      <table class="report-table">
        <tr><th colspan="3" style="background:#1b2a4a; color:#fff;">${g.toUpperCase()}</th></tr>
        <tr><th>Fórmula</th><th>Norma</th><th>Substituição</th></tr>
        ${items.map((m) => `<tr><td>${esc(m.formula)}</td><td style="font-family:monospace; font-size:10px;">${esc(m.norma)}</td><td style="font-family:monospace; font-size:10.5px;">${esc(m.substituicao)}</td></tr>`).join("")}
      </table>
    `).join("");
  }

  function bind() {}
  function coletar() {}

  return { render, bind, coletar, gerar };
})();



/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const cfg = getConfig();
  document.getElementById('empresa-nome-topo').textContent = cfg.empresa;
  App.goDashboard();
});
