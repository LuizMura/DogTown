import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1lY9XI-Np8r8Kk9I1QMo-_V537SXlOUM",
  authDomain: "dogtown-f3603.firebaseapp.com",
  projectId: "dogtown-f3603",
  storageBucket: "dogtown-f3603.appspot.com",
  messagingSenderId: "153818184475",
  appId: "1:153818184475:web:892e41f0d576c5d16931be",
  measurementId: "G-ZEPXV9VTFE",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ANALYTICS_SUMMARY_API =
  window.DOGTOWN_ANALYTICS_SUMMARY_API || "/api/analytics/summary";
const ANALYTICS_LOCAL_FALLBACK_KEY = "dogtownAnalyticsV1";
const REMEMBER_ME_KEY = "dogtownRememberMe";

let idEditando = null;
let trafficChart = null;
let stylesChart = null;
let cachedProdutos = [];
let cachedAnalytics = null;
let cachedAnalyticsAt = 0;
let analyticsInFlight = null;
let currentRangeDays = 7;
let adminInitialized = false;

const ANALYTICS_CACHE_TTL_MS = 30000;
const ANALYTICS_FETCH_TIMEOUT_MS = 1800;

const prompt = document.getElementById("produto-prompt");
const tituloPrompt = document.getElementById("titulo-prompt");
const btnAbrir = document.getElementById("abrirPrompt");
const btnCancelar = document.getElementById("cancelarPrompt");
const btnSalvar = document.getElementById("salvarProduto");

const inputNome = document.getElementById("input-nome");
const inputPreco = document.getElementById("input-preco");
const inputImagem = document.getElementById("input-imagem");
const inputTamanho = document.getElementById("input-tamanho");
const inputABV = document.getElementById("input-abv");
const inputIBU = document.getElementById("input-ibu");
const inputEstoque = document.getElementById("input-estoque");
const inputOrdem = document.getElementById("input-ordem");
const loginForm = document.getElementById("login-form");
const rememberMeInput = document.getElementById("remember-me");
const togglePasswordButton = document.getElementById("toggle-password");
const senhaInput = document.getElementById("senha");

if (rememberMeInput) {
  const savedRememberMe = localStorage.getItem(REMEMBER_ME_KEY);
  if (savedRememberMe === "0") {
    rememberMeInput.checked = false;
  }
}

const cervejasPadrao = {
  "Dogtown - LAGER": { abv: "4.5%", ibu: "11" },
  "Dogtown - APA": { abv: "5.0%", ibu: "39" },
  "Dogtown - IPA": { abv: "6.2%", ibu: "53" },
  "Dogtown - BITTER": { abv: "4.6%", ibu: "36" },
  "Dogtown - PORTER": { abv: "4.7%", ibu: "28" },
};

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
}

function formatPercent(value) {
  return `${(Number(value) || 0).toFixed(1)}%`;
}

function getLastDays(days = 7) {
  const list = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

function buildRangeDays(days) {
  return getLastDays(days);
}

function aggregatePagesForRange(analytics, rangeKeys) {
  const pageDaily =
    analytics.pageDaily && typeof analytics.pageDaily === "object"
      ? analytics.pageDaily
      : null;

  if (!pageDaily) {
    return Object.entries(analytics.pages || {}).reduce(
      (acc, [page, value]) => {
        acc[page] = {
          views: Number(value.views || 0),
          clicks: Number(value.clicks || 0),
        };
        return acc;
      },
      {},
    );
  }

  const result = {};
  rangeKeys.forEach((dayKey) => {
    const dayPages = pageDaily[dayKey] || {};
    Object.entries(dayPages).forEach(([page, value]) => {
      if (!result[page]) result[page] = { views: 0, clicks: 0 };
      result[page].views += Number(value.views || 0);
      result[page].clicks += Number(value.clicks || 0);
    });
  });

  return result;
}

function setupRangeFilters() {
  const buttons = Array.from(document.querySelectorAll(".range-btn"));
  const label = document.getElementById("dashboard-period-label");
  const title = document.getElementById("traffic-title");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentRangeDays = Number(btn.dataset.rangeDays || 7);
      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const suffix = `últimos ${currentRangeDays} dias`;
      if (label) label.textContent = `Período: ${suffix}`;
      if (title) title.textContent = `Tráfego e cliques (${suffix})`;

      await renderDashboard(cachedProdutos);
    });
  });
}

function extractStyleName(produto) {
  const nome = String(produto.nome || "").toUpperCase();
  if (nome.includes("LAGER")) return "LAGER";
  if (nome.includes("APA")) return "APA";
  if (nome.includes("IPA")) return "IPA";
  if (nome.includes("BITTER")) return "BITTER";
  if (nome.includes("PORTER")) return "PORTER";
  if (nome.includes("BARRIL")) return "BARRIL";
  return "OUTROS";
}

function emptyAnalytics() {
  return {
    totals: { pageViews: 0, clicks: 0 },
    visitors: {},
    pages: {},
    daily: {},
  };
}

function normalizeAnalytics(raw) {
  return {
    totals: {
      pageViews: Number(raw?.totals?.pageViews || 0),
      clicks: Number(raw?.totals?.clicks || 0),
    },
    visitors:
      raw?.visitors && typeof raw.visitors === "object" ? raw.visitors : {},
    pages: raw?.pages && typeof raw.pages === "object" ? raw.pages : {},
    pageDaily:
      raw?.pageDaily && typeof raw.pageDaily === "object" ? raw.pageDaily : {},
    daily: raw?.daily && typeof raw.daily === "object" ? raw.daily : {},
  };
}

function getAnalyticsSummaryCandidates() {
  const configured = String(ANALYTICS_SUMMARY_API || "").trim();
  const protocol =
    window.location.protocol === "file:" ? "http:" : window.location.protocol;
  const hostFallback =
    protocol + "//" + window.location.hostname + ":3000/api/analytics/summary";
  const localhostFallback = "http://localhost:3000/api/analytics/summary";
  const relativeFallback = "/api/analytics/summary";

  const candidates = [
    configured,
    relativeFallback,
    hostFallback,
    localhostFallback,
  ]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  if (window.location.protocol === "file:") {
    return [localhostFallback, hostFallback, configured, relativeFallback]
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index);
  }

  return candidates;
}

function mergeAnalytics(base, extra) {
  const merged = normalizeAnalytics(base || emptyAnalytics());
  const other = normalizeAnalytics(extra || emptyAnalytics());

  merged.totals.pageViews += Number(other.totals?.pageViews || 0);
  merged.totals.clicks += Number(other.totals?.clicks || 0);

  Object.entries(other.visitors || {}).forEach(([visitorId, payload]) => {
    merged.visitors[visitorId] = payload;
  });

  Object.entries(other.pages || {}).forEach(([page, values]) => {
    const target = merged.pages[page] || { views: 0, clicks: 0 };
    target.views += Number(values?.views || 0);
    target.clicks += Number(values?.clicks || 0);
    merged.pages[page] = target;
  });

  Object.entries(other.daily || {}).forEach(([dayKey, values]) => {
    const target = merged.daily[dayKey] || { views: 0, clicks: 0 };
    target.views += Number(values?.views || 0);
    target.clicks += Number(values?.clicks || 0);
    merged.daily[dayKey] = target;
  });

  Object.entries(other.pageDaily || {}).forEach(([dayKey, dayPages]) => {
    merged.pageDaily[dayKey] = merged.pageDaily[dayKey] || {};

    Object.entries(dayPages || {}).forEach(([page, values]) => {
      const target = merged.pageDaily[dayKey][page] || { views: 0, clicks: 0 };
      target.views += Number(values?.views || 0);
      target.clicks += Number(values?.clicks || 0);
      merged.pageDaily[dayKey][page] = target;
    });
  });

  return merged;
}

function readLocalAnalyticsFallback() {
  try {
    const local = JSON.parse(
      localStorage.getItem(ANALYTICS_LOCAL_FALLBACK_KEY) || "null",
    );
    return normalizeAnalytics(local || emptyAnalytics());
  } catch (_) {
    return emptyAnalytics();
  }
}

async function fetchAnalyticsSummary() {
  const cacheIsFresh =
    cachedAnalytics && Date.now() - cachedAnalyticsAt < ANALYTICS_CACHE_TTL_MS;

  if (cacheIsFresh) {
    return cachedAnalytics;
  }

  if (analyticsInFlight) {
    return analyticsInFlight;
  }

  analyticsInFlight = (async () => {
  const candidates = getAnalyticsSummaryCandidates();
  const localFallback = readLocalAnalyticsFallback();
  let bestAnalytics = null;
  let bestScore = -1;

  function scoreAnalytics(analytics) {
    const totalsScore =
      Number(analytics?.totals?.pageViews || 0) +
      Number(analytics?.totals?.clicks || 0);
    const visitorsScore = Object.keys(analytics?.visitors || {}).length;
    const dailyScore = Object.values(analytics?.daily || {}).reduce(
      (acc, day) => acc + Number(day?.views || 0) + Number(day?.clicks || 0),
      0,
    );

    return totalsScore + visitorsScore + dailyScore;
  }

  function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  const settled = await Promise.allSettled(
    candidates.map(async (url) => {
      const response = await fetchWithTimeout(url, ANALYTICS_FETCH_TIMEOUT_MS);
      if (!response.ok) return null;

      const payload = await response.json();
      return normalizeAnalytics(payload);
    }),
  );

  settled.forEach((result) => {
    if (result.status !== "fulfilled" || !result.value) {
      return;
    }

    const score = scoreAnalytics(result.value);
    if (score > bestScore) {
      bestScore = score;
      bestAnalytics = result.value;
    }
  });

  const resolvedAnalytics = bestAnalytics
    ? mergeAnalytics(bestAnalytics, localFallback)
    : localFallback;

  cachedAnalytics = resolvedAnalytics;
  cachedAnalyticsAt = Date.now();
  return resolvedAnalytics;
  })();

  try {
    return await analyticsInFlight;
  } finally {
    analyticsInFlight = null;
  }
}

function atualizarABVEIBU() {
  const padrao = cervejasPadrao[inputNome.value];
  if (padrao) {
    inputABV.value = padrao.abv;
    inputIBU.value = padrao.ibu;
  }
}

function abrirPrompt(dados = null, id = null) {
  prompt.classList.remove("hidden");

  if (dados) {
    inputOrdem.value = dados.ordem || 0;
    inputNome.value = dados.nome;
    inputPreco.value = dados.preco;
    inputImagem.value = dados.imagem;
    inputTamanho.value = dados.tamanho;
    inputABV.value = dados.abv || "";
    inputIBU.value = dados.ibu || "";
    inputEstoque.value = dados.estoque || 0;
    tituloPrompt.textContent = "Editar Produto";
    idEditando = id;
  } else {
    inputOrdem.value = 0;
    inputNome.value = "Dogtown - APA";
    inputPreco.value = "";
    inputImagem.value = "img/cervejas/breja-apa.png";
    inputTamanho.value = "500ml";
    inputABV.value = "";
    inputIBU.value = "";
    inputEstoque.value = 0;
    tituloPrompt.textContent = "Adicionar Produto";
    idEditando = null;
    atualizarABVEIBU();
  }
}

function fecharPrompt() {
  prompt.classList.add("hidden");
  idEditando = null;
}

function setupTabs() {
  const tabButtons = Array.from(document.querySelectorAll(".admin-tab"));
  const panels = Array.from(document.querySelectorAll(".admin-panel"));

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget;
      tabButtons.forEach((b) => b.classList.remove("is-active"));
      panels.forEach((p) => p.classList.remove("is-active"));

      btn.classList.add("is-active");
      const panel = document.querySelector(`[data-tab-panel="${target}"]`);
      if (panel) panel.classList.add("is-active");
    });
  });
}

function renderCharts(analytics, produtos) {
  const labels = buildRangeDays(currentRangeDays);
  const viewsData = labels.map((k) => analytics.daily?.[k]?.views || 0);
  const clicksData = labels.map((k) => analytics.daily?.[k]?.clicks || 0);

  const styleMap = {};
  produtos.forEach((item) => {
    const style = extractStyleName(item);
    styleMap[style] = (styleMap[style] || 0) + 1;
  });

  const trafficCtx = document.getElementById("chart-traffic");
  const styleCtx = document.getElementById("chart-styles");
  if (!window.Chart || !trafficCtx || !styleCtx) return;

  if (trafficChart) trafficChart.destroy();
  trafficChart = new window.Chart(trafficCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Visualizações",
          data: viewsData,
          borderColor: "#68c2ff",
          backgroundColor: "rgba(104, 194, 255, 0.2)",
          tension: 0.35,
        },
        {
          label: "Cliques",
          data: clicksData,
          borderColor: "#e9b15f",
          backgroundColor: "rgba(233, 177, 95, 0.2)",
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#dbe5f3" } } },
      scales: {
        x: {
          ticks: { color: "#9ab0c9" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "#9ab0c9" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
    },
  });

  if (stylesChart) stylesChart.destroy();
  stylesChart = new window.Chart(styleCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(styleMap),
      datasets: [
        {
          data: Object.values(styleMap),
          backgroundColor: [
            "#68c2ff",
            "#e9b15f",
            "#87d29c",
            "#9f8cff",
            "#f27f7f",
            "#b9c2ce",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: "#dbe5f3" } } },
    },
  });
}

async function renderDashboard(produtos, analyticsOverride = null) {
  const analytics = analyticsOverride || (await fetchAnalyticsSummary());
  const rangeKeys = buildRangeDays(currentRangeDays);
  const rangeViews = rangeKeys.reduce(
    (acc, key) => acc + Number(analytics.daily?.[key]?.views || 0),
    0,
  );
  const rangeClicks = rangeKeys.reduce(
    (acc, key) => acc + Number(analytics.daily?.[key]?.clicks || 0),
    0,
  );
  const hasRangeData = rangeKeys.some((key) => {
    const day = analytics.daily?.[key];
    return day && (Number(day.views || 0) > 0 || Number(day.clicks || 0) > 0);
  });
  const visitors = Object.keys(analytics.visitors || {}).length;
  const views = hasRangeData
    ? rangeViews
    : Number(analytics.totals?.pageViews || 0);
  const clicks = hasRangeData
    ? rangeClicks
    : Number(analytics.totals?.clicks || 0);
  const ctr = views > 0 ? (clicks / views) * 100 : 0;

  const totalStock = produtos.reduce(
    (acc, p) => acc + Number(p.estoque || 0),
    0,
  );

  document.getElementById("metric-visitors").textContent =
    formatNumber(visitors);
  document.getElementById("metric-views").textContent = formatNumber(views);
  document.getElementById("metric-clicks").textContent = formatNumber(clicks);
  document.getElementById("metric-ctr").textContent = formatPercent(ctr);
  document.getElementById("metric-products").textContent = formatNumber(
    produtos.length,
  );
  document.getElementById("metric-stock").textContent =
    formatNumber(totalStock);

  const pagesBody = document.getElementById("analytics-pages-body");
  pagesBody.innerHTML = "";

  const pageRangeMap = aggregatePagesForRange(analytics, rangeKeys);

  const pagesSorted = Object.entries(pageRangeMap)
    .map(([page, values]) => ({
      page,
      views: Number(values.views || 0),
      clicks: Number(values.clicks || 0),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  if (pagesSorted.length === 0) {
    pagesBody.innerHTML =
      '<tr><td colspan="4">Sem dados ainda. Navegue no site para iniciar a coleta.</td></tr>';
  } else {
    pagesSorted.forEach((item) => {
      const row = document.createElement("tr");
      const rowCtr = item.views > 0 ? (item.clicks / item.views) * 100 : 0;
      row.innerHTML = `
        <td>${item.page}</td>
        <td>${formatNumber(item.views)}</td>
        <td>${formatNumber(item.clicks)}</td>
        <td>${formatPercent(rowCtr)}</td>
      `;
      pagesBody.appendChild(row);
    });
  }

  renderCharts(analytics, produtos);
}

async function carregarProdutos() {
  const lista = document.getElementById("lista-produtos");
  lista.innerHTML = "";

  const analyticsPromise = fetchAnalyticsSummary();
  const snapshot = await getDocs(collection(db, "produtos"));
  const produtos = snapshot.docs
    .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  cachedProdutos = produtos;

  produtos.forEach((dados) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="produto-thumb" src="${dados.imagem}" alt="${dados.nome}" /></td>
      <td>${dados.nome || "-"}</td>
      <td>${dados.tamanho || "-"}</td>
      <td>R$ ${(Number(dados.preco) || 0).toFixed(2)}</td>
      <td>${dados.abv || "-"} / ${dados.ibu || "-"}</td>
      <td>${Number(dados.estoque || 0)}</td>
      <td>${Number(dados.ordem || 0)}</td>
      <td>
        <button class="btn-edit" data-action="edit">Editar</button>
        <button class="btn-delete" data-action="delete">Remover</button>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
      abrirPrompt(dados, dados.id);
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", () => {
      removerProduto(dados.id);
    });

    lista.appendChild(tr);
  });

  await renderDashboard(produtos, await analyticsPromise);
}

async function removerProduto(id) {
  await deleteDoc(doc(db, "produtos", id));
  await carregarProdutos();
}

async function showAdminSection() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("admin-section").style.display = "block";

  if (!adminInitialized) {
    setupTabs();
    setupRangeFilters();
    adminInitialized = true;
  }

  await carregarProdutos();
}

window.login = async () => {
  const email = document.getElementById("email").value;
  const senha = senhaInput.value;
  const rememberMe = Boolean(rememberMeInput?.checked);

  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence,
    );

    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "1" : "0");
    await signInWithEmailAndPassword(auth, email, senha);
    await showAdminSection();
  } catch (error) {
    alert("Login falhou: " + error.message);
  }
};

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    window.login();
  });
}

if (togglePasswordButton && senhaInput) {
  togglePasswordButton.addEventListener("click", () => {
    const nextType = senhaInput.type === "password" ? "text" : "password";
    const showingPassword = nextType === "text";

    senhaInput.type = nextType;
    togglePasswordButton.setAttribute(
      "aria-label",
      showingPassword ? "Ocultar senha" : "Mostrar senha",
    );
    togglePasswordButton.setAttribute(
      "title",
      showingPassword ? "Ocultar senha" : "Mostrar senha",
    );
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    return;
  }

  showAdminSection().catch(() => {
    // Keep login visible if dashboard initialization fails.
  });
});

btnAbrir.addEventListener("click", () => abrirPrompt());
btnCancelar.addEventListener("click", () => fecharPrompt());
inputNome.addEventListener("change", atualizarABVEIBU);

btnSalvar.addEventListener("click", async () => {
  const produto = {
    nome: inputNome.value.trim(),
    preco: parseFloat(inputPreco.value),
    imagem: inputImagem.value.trim(),
    tamanho: inputTamanho.value.trim(),
    abv: inputABV.value.trim(),
    ibu: inputIBU.value.trim(),
    estoque: parseInt(inputEstoque.value, 10),
    ordem: parseInt(inputOrdem.value, 10) || 0,
  };

  if (!produto.nome || Number.isNaN(produto.preco) || produto.preco <= 0) {
    alert(
      "Nome e preço são obrigatórios e o preço deve ser um valor positivo.",
    );
    return;
  }

  try {
    if (idEditando) {
      await updateDoc(doc(db, "produtos", idEditando), produto);
    } else {
      await addDoc(collection(db, "produtos"), produto);
    }

    fecharPrompt();
    await carregarProdutos();
  } catch (error) {
    alert("Erro ao salvar produto: " + error.message);
  }
});

window.abrirPrompt = abrirPrompt;
window.removerProduto = removerProduto;
window.renderDashboard = () => renderDashboard(cachedProdutos);
