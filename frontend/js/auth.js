async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    alert("Login inválido");
    return;
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);

  window.location.href = "dashboard.html";
}
