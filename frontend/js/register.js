async function register() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        if (response.ok) {
            alert("Conta criada com sucesso! Faça login.");
            window.location.href = "index.html";
        } else {
            const data = await response.json(); 
            alert("Erro ao criar conta: " + (data.message || "Tente novamente."));
        }
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro de conexão com o servidor.");
    }
}
