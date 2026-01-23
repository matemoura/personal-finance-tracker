async function login(event) {
  
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      alert("Login inválido. Verifique suas credenciais.");
      return;
    }

    const data = await response.json();
    
    localStorage.setItem("token", data.token);

    window.location.href = "dashboard.html";
    
  } catch (error) {
    console.error("Erro na requisição:", error);
    alert("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", login);
  }
});
