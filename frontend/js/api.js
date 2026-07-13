const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "https://SEU-BACKEND.onrender.com"; // TODO: substituir pela URL real do Render após o deploy (Fase 5)

function getToken() {
  return localStorage.getItem("token");
}

function formatCurrency(value) {
  return new Intl.NumberFormat(navigator.language, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(navigator.language).format(date);
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

    e.target.value = new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  });
}
