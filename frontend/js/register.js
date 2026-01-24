document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

    if (!regex.test(password)) {
        alert("A senha deve ter no mínimo 8 caracteres, contendo letra, número e caractere especial (@$!%*#?&).");
        return;
    }

    const userData = {
        name: name,
        email: email,
        password: password
    };

    const submitBtn = document.querySelector("button[type='submit']");
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Cadastrando...";
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            const data = await response.json();

            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", data.name);
            localStorage.removeItem("userPhoto");

            alert("Conta criada! Redirecionando...");
            window.location.href = "dashboard.html"; 
        } else {
            try {
                const errorData = await response.json();
                if (errorData.errors) {
                    alert("Erro: " + Object.values(errorData.errors).join("\n"));
                } else {
                    alert("Erro: " + (errorData.message || "Falha ao criar conta."));
                }
            } catch (e) {
                alert("Erro ao criar conta.");
            }
        }
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro de conexão.");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});
