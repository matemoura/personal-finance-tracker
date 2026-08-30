async function login(event) {

  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const submitBtn = document.querySelector("button[type='submit']");
  const originalText = submitBtn.innerText;
  submitBtn.innerText = "Entrando...";
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      showToast("Login inválido. Verifique suas credenciais.", "error");
      return;
    }

    const data = await response.json();

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.name);

    if (data.photoUrl) {
      localStorage.setItem("userPhoto", data.photoUrl);
    } else {
      localStorage.removeItem("userPhoto");
    }

    stampConfirmation("login-stamp", () => {
      window.location.href = "dashboard.html";
    });

  } catch (error) {
    console.error("Erro na requisição:", error);
    showToast("Erro ao conectar com o servidor. Verifique se o backend está rodando.", "error");
  } finally {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const notice = sessionStorage.getItem("loginNotice");
  if (notice) {
    sessionStorage.removeItem("loginNotice");
    showToast(notice, "error");
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", login);
  }

  if (document.getElementById("preview-balance")) {
    runLoginPreview();
    setInterval(runLoginPreview, 6000);
  }
});

// Preview animado (dados fictícios) do painel esquerdo da tela de login —
// reaproveita a mesma linguagem de movimento do app real (contagem,
// lançamento de linha, traço de gráfico) no lugar de foto/vídeo externo.
const LOGIN_PREVIEW_ROWS = [
  { desc: "Salário", cat: "Renda", amount: 5200, credit: true },
  { desc: "Aluguel", cat: "Moradia", amount: -1300 },
  { desc: "Mercado", cat: "Compras", amount: -412.6 }
];

function runLoginPreview() {
  const balanceEl = document.getElementById("preview-balance");
  const rowsEl = document.getElementById("preview-rows");
  const spark = document.getElementById("preview-spark");
  if (!balanceEl || !rowsEl || !spark) return;

  rowsEl.innerHTML = "";
  spark.classList.remove("draw");

  animateCount(balanceEl, 3487.4);

  const reduced = prefersReducedMotion();
  LOGIN_PREVIEW_ROWS.forEach((r, i) => {
    const row = document.createElement("div");
    row.className = "lp-row";
    row.innerHTML = `
      <span class="lp-desc">${escapeHtml(r.desc)}<div class="lp-cat">${escapeHtml(r.cat)}</div></span>
      <span class="lp-amt ${r.credit ? "credit" : "debit"}">${r.credit ? "+" : "−"} R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(r.amount))}</span>
    `;
    rowsEl.appendChild(row);
    row.style.animationDelay = reduced ? "0ms" : `${i * 140}ms`;
    requestAnimationFrame(() => row.classList.add("show"));
  });

  requestAnimationFrame(() => spark.classList.add("draw"));
}
