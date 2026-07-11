const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8080"
    : "https://SEU-BACKEND.onrender.com"; // TODO: substituir pela URL real do Render após o deploy (Fase 5)

function getToken() {
  return localStorage.getItem("token");
}
