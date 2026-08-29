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

// ---------- Erros de formulário inline (embaixo do campo, não só em toast) ----------
// Cria/atualiza um <p class="field-error"> logo depois do campo e liga os dois
// via aria-describedby — assim quem usa leitor de tela ouve qual campo falhou
// e por quê, não só um toast genérico no canto da tela.
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  let errorEl = document.getElementById(fieldId + "-error");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.id = fieldId + "-error";
    errorEl.className = "field-error";
    errorEl.setAttribute("role", "alert");
    field.insertAdjacentElement("afterend", errorEl);
  }

  errorEl.textContent = message;
  errorEl.classList.add("visible");
  field.classList.add("field-invalid");
  field.setAttribute("aria-describedby", errorEl.id);
  field.setAttribute("aria-invalid", "true");
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const errorEl = document.getElementById(fieldId + "-error");
  if (errorEl) errorEl.classList.remove("visible");
  field.classList.remove("field-invalid");
  field.removeAttribute("aria-invalid");
}

function clearFieldErrors(fieldIds) {
  fieldIds.forEach(clearFieldError);
}

// Roda uma lista de checagens { id, valid, message }, mostra erro inline em
// cada campo inválido e foca o primeiro deles. Retorna true só se tudo passou.
function validateFields(checks) {
  let firstInvalidId = null;

  checks.forEach(({ id, valid, message }) => {
    if (valid) {
      clearFieldError(id);
    } else {
      setFieldError(id, message);
      if (!firstInvalidId) firstInvalidId = id;
    }
  });

  if (firstInvalidId) {
    document.getElementById(firstInvalidId).focus();
    return false;
  }
  return true;
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

// SVGs inline (sem emoji) no mesmo estilo outline dos ícones de navegação —
// evita depender de fonte de emoji do sistema e funciona bem em leitor de tela
// combinado com o aria-label do botão.
const ICON_SUN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3.2"></circle><path d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M3.3 12.7l1.1-1.1M11.6 4.4l1.1-1.1"></path></svg>';
const ICON_MOON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8.5A5.5 5.5 0 1 1 7.5 2.5a4.2 4.2 0 0 0 6 6Z"></path></svg>';
const ICON_EYE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"></path><circle cx="8" cy="8" r="2"></circle></svg>';
const ICON_EYE_OFF = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 2l12 12M6.6 6.7a2 2 0 0 0 2.7 2.7M4.3 4.6C2.5 5.7 1 8 1 8s2.5 5 7 5c1.2 0 2.2-.3 3.1-.8M9.9 3.3C9.3 3.1 8.7 3 8 3c-.6 0-1.2.1-1.7.2M13.3 5.3C14.4 6.3 15 8 15 8s-.6 1.7-1.7 2.7"></path></svg>';
const ICON_BELL = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5c-2 0-3.5 1.6-3.5 3.6v2.4c0 .5-.2 1-.5 1.4l-1 1.3c-.3.4 0 1 .5 1h9c.5 0 .8-.6.5-1l-1-1.3c-.3-.4-.5-.9-.5-1.4V5.1c0-2-1.5-3.6-3.5-3.6Z"></path><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"></path></svg>';
const ICON_CLOSE = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"></path></svg>';
const ICON_EDIT = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2l3 3-8 8-3.5.5.5-3.5 8-8Z"></path></svg>';
const ICON_TRASH = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4h11M6 4V2.5h4V4M4.5 4l.5 9.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1L11.5 4"></path></svg>';
const ICON_PLUS = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11"></path></svg>';
const ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7-8"></path></svg>';
const ICON_COIN = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.3"></circle><path d="M8 4.5v7M10 6.3c0-.9-.9-1.6-2-1.6s-2 .7-2 1.6c0 2.2 4 1.2 4 3.4 0 .9-.9 1.6-2 1.6s-2-.7-2-1.6"></path></svg>';

function updateThemeIcons() {
  const isDark = getEffectiveTheme() === "dark";
  const icon = isDark ? ICON_SUN : ICON_MOON;
  const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";
  ["theme-icon-desktop", "theme-icon-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = icon;
    const btn = el.closest("button");
    if (btn) btn.setAttribute("aria-label", label);
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
  const icon = valuesHidden ? ICON_EYE_OFF : ICON_EYE;
  const label = valuesHidden ? "Mostrar valores" : "Ocultar valores";
  ["hide-values-icon-desktop", "hide-values-icon-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = icon;
    const btn = el.closest("button");
    if (btn) btn.setAttribute("aria-label", label);
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

    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    const items = [];

    // Contas atrasadas (qualquer data no passado) ou que vencem dentro dos
    // próximos 7 dias — nem tão em cima da hora que só pega o dia exato, nem
    // tão cedo que lota o sino com coisa que só vence mês que vem.
    bills.forEach(b => {
      if (b.status === "PAID") return;
      const due = new Date(b.dueDate + "T00:00:00");
      if (b.status === "OVERDUE" || due <= horizon) {
        items.push({ page: "bills.html", label: b.description, amount: b.amount, date: b.dueDate });
      }
    });

    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    // Só a fatura do mês corrente entra no lembrete (com sua própria data de
    // vencimento) — atraso de meses anteriores fica só no painel de Cartões,
    // pra não misturar um total de vários meses com uma data de um mês só.
    cards.forEach(c => {
      if (!c.dueDay || !(c.pendingCurrentMonth > 0)) return;

      const lastDayOfMonth = new Date(year, month, 0).getDate();
      const dueDay = Math.min(c.dueDay, lastDayOfMonth);
      const dueDateStr = `${year}-${String(month).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
      const currentInvoiceDue = new Date(year, month - 1, dueDay) <= horizon;

      if (currentInvoiceDue) {
        items.push({
          page: "transactions.html",
          label: c.name,
          amount: c.pendingCurrentMonth,
          date: dueDateStr
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
            <span class="min-w-0">
                <span class="block text-sm font-medium truncate" style="color:var(--app-heading)">${escapeHtml(i.label)}</span>
                ${i.date ? `<span class="block text-[11px]" style="color:var(--app-muted)">vence ${formatDate(i.date)}</span>` : ""}
            </span>
            <span class="text-sm font-bold flex-shrink-0 whitespace-nowrap" style="color:var(--app-danger)">R$ ${formatCurrency(i.amount)}</span>
        </a>
    `).join("");
}

function toggleDueReminders() {
  const panel = document.getElementById("due-reminders-panel");
  if (panel) panel.classList.toggle("hidden");
}

// Menu de navegação mobile (hambúrguer) — o nav de topo tinha os 5 links numa
// fileira com scroll horizontal; isso empurrava layout pra fora da tela em
// telas bem estreitas. Agora só o nome da página atual fica visível, e o
// menu completo abre num dropdown, igual ao sino/menu do usuário.
function toggleMobileNavMenu() {
  const menu = document.getElementById("mobile-nav-menu");
  if (menu) menu.classList.toggle("hidden");
}

document.addEventListener("click", (event) => {
  const panel = document.getElementById("due-reminders-panel");
  if (panel && !panel.classList.contains("hidden") &&
      !panel.contains(event.target) && !event.target.closest("[data-due-reminders-trigger]")) {
    panel.classList.add("hidden");
  }

  const navMenu = document.getElementById("mobile-nav-menu");
  if (navMenu && !navMenu.classList.contains("hidden") &&
      !navMenu.contains(event.target) && !event.target.closest("[data-mobile-nav-trigger]")) {
    navMenu.classList.add("hidden");
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

function toggleInstallmentFields() {
  const checkbox = document.getElementById("isInstallment");
  const fields = document.getElementById("installmentFields");
  if (!checkbox || !fields) return;
  fields.classList.toggle("hidden", !checkbox.checked);
}
