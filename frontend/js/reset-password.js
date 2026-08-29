async function doReset() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const newPassword = document.getElementById('newPass').value;

    if (!token) {
        showToast("Link inválido ou expirado. Solicite novamente.", "error");
        return;
    }

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

    const isValid = validateFields([
        { id: "newPass", valid: regex.test(newPassword), message: "Mín. 8 caracteres, com letra, número e caractere especial (@$!%*#?&)." }
    ]);
    if (!isValid) return;

    const btn = document.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Salvando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/auth/reset-password?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword })
        });

        if (response.ok) {
            showToast("Senha alterada com sucesso! Faça login agora.", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 1500);
        } else {
            const errorMsg = await response.text();
            showToast("Erro: " + errorMsg, "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
