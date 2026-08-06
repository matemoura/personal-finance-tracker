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

    window.location.href = "dashboard.html";

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
});
