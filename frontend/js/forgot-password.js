async function requestReset() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value;

    if (!validateFields([{ id: "email", valid: !!email, message: "Digite seu e-mail." }])) return;

    const btn = document.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Enviando...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            showToast("E-mail enviado! Verifique sua caixa de entrada (e spam).", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 2000);
        } else {
            showToast("Erro ao enviar. Verifique se o e-mail está correto.", "error");
        }
    } catch (error) {
        console.error("Erro:", error);
        showToast("Erro de conexão com o servidor.", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
