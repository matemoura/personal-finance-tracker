const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "https://personal-finance-tracker-b838.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

// Desloga e volta pro login. Uma "message" opcional (ex: servidor fora do ar)
// é mostrada como toast na tela de login, pra não parecer erro de senha.
function forceLogout(message) {
  localStorage.removeItem("token");
  if (message) sessionStorage.setItem("loginNotice", message);
  window.location.href = "index.html";
}

// Requisição autenticada: injeta o Bearer token e desloga em 401/403 (sessão expirada)
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    forceLogout();
    throw new Error("Sessão expirada");
  }

  return response;
}

// ---------- Verificação periódica de sessão/conectividade ----------
// Sem isso, o logoff só acontecia reativamente (na próxima chamada de API que o
// usuário disparasse). Se o token expirasse ou o Render caísse com a aba aberta
// e sem nenhuma tela sendo trocada, nada avisava o usuário — a tela ficava
// parada, sem recarregar para o login por conta própria.
const SESSION_CHECK_INTERVAL_MS = 120000;
let sessionCheckFailures = 0;

async function checkSessionAlive() {
  const token = getToken();
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 401 || response.status === 403) {
      forceLogout();
      return;
    }

    sessionCheckFailures = 0;
  } catch (error) {
    // fetch() só lança aqui quando o servidor está inalcançável (Render
    // dormindo/caído, sem rede) — exige 2 falhas seguidas antes de deslogar,
    // pra não reagir a uma instabilidade momentânea de rede.
    sessionCheckFailures++;
    if (sessionCheckFailures >= 2) {
      forceLogout("Não foi possível conectar ao servidor. Faça login novamente para tentar de novo.");
    }
  }
}

function startSessionWatcher() {
  if (!getToken()) return;
  setInterval(checkSessionAlive, SESSION_CHECK_INTERVAL_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSessionWatcher);
} else {
  startSessionWatcher();
}

function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:90vw;";
    document.body.appendChild(container);
  }

  const colors = {
    success: "#15803d",
    error: "#b91c1c",
    info: "#755c47"
  };

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText =
    `background:${colors[type] || colors.info};color:#fff;padding:12px 20px;border-radius:8px;` +
    "box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:14px;font-weight:600;" +
    "opacity:0;transform:translateY(-8px);transition:opacity .25s,transform .25s;";
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Escapa texto digitado pelo usuário (descrição, nome de categoria/cartão, etc.)
// antes de inserir em innerHTML, evitando XSS armazenado (ex: uma descrição
// como "<img src=x onerror=...>" executando como HTML de verdade na tela).
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- Logos de banco nos cartões ----------
// O campo "icon" do cartão guarda ou um emoji (comportamento antigo, digitado
// livremente) ou o domínio de um banco conhecido (ex: "nubank.com.br"), usado
// pra buscar a logo real via o serviço de favicons do Google (não depende de
// chave de API e não embute nenhuma arte de marca registrada no código — a
// imagem é carregada direto da fonte pública, como o próprio Chrome faz pra
// mostrar o ícone de um site).
const KNOWN_BANKS = [
  { domain: "nubank.com.br", name: "Nubank", emoji: "💜" },
  { domain: "c6bank.com.br", name: "C6 Bank", emoji: "🖤" },
  { domain: "itau.com.br", name: "Itaú", emoji: "🧡" },
  { domain: "bradesco.com.br", name: "Bradesco", emoji: "❤️" },
  { domain: "bb.com.br", name: "Banco do Brasil", emoji: "💛" },
  { domain: "caixa.gov.br", name: "Caixa", emoji: "💙" },
  { domain: "santander.com.br", name: "Santander", emoji: "❤️" },
  { domain: "bancointer.com.br", name: "Inter", emoji: "🧡" },
  { domain: "mercadopago.com.br", name: "Mercado Pago", emoji: "💙" },
  { domain: "picpay.com", name: "PicPay", emoji: "💚" },
  { domain: "neon.com.br", name: "Neon", emoji: "🩵" },
  { domain: "original.com.br", name: "Original", emoji: "💚" },
  { domain: "willbank.com.br", name: "Will Bank", emoji: "💜" },
  { domain: "btgpactual.com", name: "BTG Pactual", emoji: "🖤" },
  { domain: "xpi.com.br", name: "XP", emoji: "💛" }
];

function findBankByDomain(icon) {
  return KNOWN_BANKS.find(b => b.domain === icon);
}

// Usado nos <option> de <select> (não suportam <img>): mostra a logo real nos
// lugares que aceitam HTML, e cai pro emoji da marca só nesses textos simples.
function bankEmojiFor(icon) {
  const bank = findBankByDomain(icon);
  return bank ? bank.emoji : (icon || "💳");
}

// Gera o HTML do ícone do cartão: <img> com a logo real para bancos
// conhecidos (com fallback pro emoji se a imagem falhar ao carregar), ou o
// emoji/texto digitado livremente para cartões personalizados.
function renderCardIcon(icon, cardName, sizeClass) {
  const bank = findBankByDomain(icon);
  const size = sizeClass || "w-5 h-5";

  if (bank) {
    const fallback = escapeHtml(bank.emoji);
    return `<img src="https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64" alt="${escapeHtml(bank.name)}"
                 class="${size} rounded object-contain flex-shrink-0" loading="lazy"
                 onerror="this.outerHTML='<span class=&quot;${size} flex items-center justify-center flex-shrink-0&quot;>${fallback}</span>'">`;
  }

  return `<span class="${size} flex items-center justify-center flex-shrink-0">${escapeHtml(icon) || "💳"}</span>`;
}

// ---------- Seletor visual de cartão (mostra a logo, não só um emoji) ----------
// <select><option> nativo não aceita <img> dentro da lista — por isso o
// <select> original fica escondido só como fonte de valor (todo o resto do
// código continua lendo/gravando .value nele normalmente) e um dropdown
// próprio é desenhado por cima, mostrando a logo de cada cartão. Cada opção
// carrega o ícone do cartão em data-icon, preenchido por quem popula o select
// (populateCardSelect, populateCardFilter, etc.).
function initCardPicker(selectId) {
  const select = document.getElementById(selectId);
  if (!select || select.dataset.pickerInit) {
    refreshCardPicker(selectId);
    return;
  }
  const originalClasses = select.className;
  select.dataset.pickerInit = "1";
  select.classList.add("hidden");

  // "flex-1" cobre o caso de o select estar numa linha flex (ex: ao lado do
  // botão "+"); "w-full" cobre o caso de estar num grid/bloco (ex: filtro).
  // Um dos dois sempre se aplica de verdade dependendo do container-pai; o
  // outro fica sem efeito, então não tem problema declarar os dois juntos.
  const wrapper = document.createElement("div");
  wrapper.className = "relative flex-1 min-w-0 w-full";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = (originalClasses.replace("hidden", "").trim() || "app-select px-3 py-2 rounded-lg text-[13px]") +
      " w-full flex items-center gap-2 text-left cursor-pointer";

  const panel = document.createElement("div");
  panel.setAttribute("data-card-picker-panel", "");
  panel.className = "hidden absolute z-30 mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-lg py-1";
  panel.style.cssText = "background:var(--app-surface);border:1px solid var(--app-border);box-shadow:0 10px 25px rgba(0,0,0,.2)";

  select.insertAdjacentElement("afterend", wrapper);
  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  trigger.onclick = () => {
    document.querySelectorAll("[data-card-picker-panel]").forEach(p => { if (p !== panel) p.classList.add("hidden"); });
    panel.classList.toggle("hidden");
  };

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) panel.classList.add("hidden");
  });

  refreshCardPicker(selectId);
}

// Redesenha as opções do dropdown a partir do <select> escondido — chame
// depois de repopular as <option>s (ex: quando a lista de cartões muda).
function refreshCardPicker(selectId) {
  const select = document.getElementById(selectId);
  const wrapper = select && select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains("relative")) return;

  const panel = wrapper.querySelector("[data-card-picker-panel]");
  const options = Array.from(select.options);

  panel.innerHTML = options.map(opt => `
        <div class="px-3 py-1.5 cursor-pointer hover:bg-[var(--app-soft)] flex items-center gap-2 text-[13px]" data-value="${escapeHtml(opt.value)}" style="color:var(--app-text)">
            ${opt.dataset.icon ? renderCardIcon(opt.dataset.icon, opt.text, "w-4 h-4") : ""}
            <span class="truncate">${escapeHtml(opt.text)}</span>
        </div>
    `).join("");

  panel.querySelectorAll("[data-value]").forEach(row => {
    row.onclick = () => {
      select.value = row.dataset.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      panel.classList.add("hidden");
      renderCardPickerTrigger(selectId);
    };
  });

  renderCardPickerTrigger(selectId);
}

// Redesenha só o botão visível (ícone + nome do cartão atualmente
// selecionado) — chame depois de mudar select.value programaticamente
// (ex: ao abrir o modal de edição já com um cartão preenchido).
function renderCardPickerTrigger(selectId) {
  const select = document.getElementById(selectId);
  const wrapper = select && select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains("relative")) return;

  const trigger = wrapper.querySelector("button");
  const selected = select.options[select.selectedIndex];
  if (!selected) {
    trigger.innerHTML = "";
    return;
  }

  trigger.innerHTML = `
        ${selected.dataset.icon ? renderCardIcon(selected.dataset.icon, selected.text, "w-4 h-4") : ""}
        <span class="truncate">${escapeHtml(selected.text)}</span>
    `;
}

// ---------- Tema claro/escuro ----------
// null armazenado = "segue o sistema" (nunca escolhido manualmente). O script
// anti-flash no <head> de cada página já aplica isso antes do primeiro paint;
// aqui só cuidamos do botão e de reagir a mudanças do tema do sistema.
function getStoredTheme() {
  return localStorage.getItem("theme");
}

function getEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}

function updateThemeIcons() {
  const icon = getEffectiveTheme() === "dark" ? "☀️" : "🌙";
  ["theme-icon-desktop", "theme-icon-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = icon;
  });
}

function applyStoredTheme() {
  const stored = getStoredTheme();
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeIcons();
}

function toggleTheme() {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyStoredTheme();
}

function initThemeAndPrivacyControls() {
  applyStoredTheme();
  updateHideValuesIcon();
  checkDueReminders();

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!getStoredTheme()) updateThemeIcons();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeAndPrivacyControls);
} else {
  initThemeAndPrivacyControls();
}

// ---------- Ocultar valores monetários ----------
let valuesHidden = localStorage.getItem("hideValues") === "true";

function updateHideValuesIcon() {
  const icon = valuesHidden ? "🙈" : "👁️";
  ["hide-values-icon-desktop", "hide-values-icon-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = icon;
  });
}

// Depois de alternar, cada página tenta recarregar só os próprios dados
// (via refreshCurrentView, se a página definir uma); sem isso, cai para um
// reload completo — os valores já foram mascarados/desmascarados desde o
// próximo formatCurrency(), só precisamos repintar o que já está na tela.
function toggleHideValues() {
  valuesHidden = !valuesHidden;
  localStorage.setItem("hideValues", valuesHidden ? "true" : "false");
  updateHideValuesIcon();

  if (typeof refreshCurrentView === "function") {
    refreshCurrentView();
  } else {
    location.reload();
  }
}

// ---------- Lembretes de vencimento (contas e faturas de cartão) ----------
// Fica ativo até a conta/fatura ser marcada como paga — não é uma notificação
// push, é um sino com contador que reaparece toda vez que o app é aberto,
// em qualquer página, enquanto o item continuar pendente.
async function checkDueReminders() {
  const badgeEl = document.getElementById("due-reminders-badge-desktop");
  if (!badgeEl || !getToken()) return;

  try {
    const [billsRes, cardsRes] = await Promise.all([
      apiFetch("/api/bills"),
      apiFetch("/api/cards")
    ]);
    if (!billsRes.ok || !cardsRes.ok) return;

    const bills = await billsRes.json();
    const cards = await cardsRes.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = [];

    bills.forEach(b => {
      if (b.status === "PAID") return;
      const due = new Date(b.dueDate + "T00:00:00");
      if (b.status === "OVERDUE" || due <= today) {
        items.push({ page: "bills.html", label: b.description, amount: b.amount });
      }
    });

    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    cards.forEach(c => {
      const hasBacklog = (c.pendingTotal - c.pendingCurrentMonth) > 0.005;
      let currentInvoiceDue = false;

      if (c.dueDay && c.pendingCurrentMonth > 0) {
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const dueDate = new Date(year, month - 1, Math.min(c.dueDay, lastDayOfMonth));
        currentInvoiceDue = dueDate <= today;
      }

      if (hasBacklog || currentInvoiceDue) {
        items.push({
          page: "transactions.html",
          label: c.name,
          amount: hasBacklog ? c.pendingTotal : c.pendingCurrentMonth
        });
      }
    });

    renderDueReminders(items);
  } catch (error) {
    console.error("Erro ao verificar lembretes de vencimento:", error);
  }
}

function renderDueReminders(items) {
  const count = items.length;
  ["due-reminders-badge-desktop", "due-reminders-badge-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count > 9 ? "9+" : String(count);
    el.classList.toggle("hidden", count === 0);
  });

  const list = document.getElementById("due-reminders-list");
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<p class="text-sm text-center py-4" style="color:var(--app-muted)">Nada vencendo. 🎉</p>';
    return;
  }

  list.innerHTML = items.map(i => `
        <a href="${i.page}" class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-[var(--app-soft)] transition no-underline">
            <span class="text-sm font-medium truncate min-w-0" style="color:var(--app-heading)">${escapeHtml(i.label)}</span>
            <span class="text-sm font-bold flex-shrink-0 whitespace-nowrap" style="color:var(--app-danger)">R$ ${formatCurrency(i.amount)}</span>
        </a>
    `).join("");
}

function toggleDueReminders() {
  const panel = document.getElementById("due-reminders-panel");
  if (panel) panel.classList.toggle("hidden");
}

document.addEventListener("click", (event) => {
  const panel = document.getElementById("due-reminders-panel");
  if (panel && !panel.classList.contains("hidden") &&
      !panel.contains(event.target) && !event.target.closest("[data-due-reminders-trigger]")) {
    panel.classList.add("hidden");
  }
});

function formatCurrency(value) {
  if (valuesHidden) return "••••";
  return new Intl.NumberFormat("pt-BR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function parseCurrencyInput(formattedValue) {
  const rawNumbers = formattedValue.replace(/\D/g, "");
  return parseFloat(rawNumbers) / 100;
}

function setupMoneyInput() {
  const input = document.getElementById("amount");
  if (!input) return;

  input.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    let numericValue = parseInt(value || "0") / 100;

    e.target.value = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  });
}

// Soma "monthsToAdd" meses a uma data "YYYY-MM-DD", mantendo o dia
// (ou o último dia do mês, se o mês de destino for mais curto — ex: dia 31 + 1 mês em abril).
function addMonthsClamped(dateStr, monthsToAdd) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const totalMonths = (m - 1) + monthsToAdd;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d, lastDayOfTargetMonth);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toggleInstallmentFields() {
  const checkbox = document.getElementById("isInstallment");
  const fields = document.getElementById("installmentFields");
  if (!checkbox || !fields) return;
  fields.classList.toggle("hidden", !checkbox.checked);
}
