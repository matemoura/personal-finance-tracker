const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "https://personal-finance-tracker-b838.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

// Requisição autenticada: injeta o Bearer token e desloga em 401/403 (sessão expirada)
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    window.location.href = "index.html";
    throw new Error("Sessão expirada");
  }

  return response;
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

function formatCurrency(value) {
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
