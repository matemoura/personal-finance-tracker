document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

    const isValid = validateFields([
        { id: "password", valid: regex.test(password), message: "Mín. 8 caracteres, com letra, número e caractere especial (@$!%*#?&)." }
    ]);
    if (!isValid) return;

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

            showToast("Conta criada! Redirecionando...", "success");
            setTimeout(() => { window.location.href = "dashboard.html"; }, 1200);
        } else {
            try {
                const errorData = await response.json();
                if (errorData.errors) {
                    showToast("Erro: " + Object.values(errorData.errors).join("\n"), "error");
                } else {
                    showToast("Erro: " + (errorData.message || "Falha ao criar conta."), "error");
                }
            } catch (e) {
                showToast("Erro ao criar conta.", "error");
            }
        }
    } catch (error) {
        console.error("Erro:", error);
        showToast("Erro de conexão.", "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});
