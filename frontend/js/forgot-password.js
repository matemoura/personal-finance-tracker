async function requestReset() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value;

    if (!email) {
        alert("Por favor, digite seu e-mail.");
        return;
    }

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
            alert("E-mail enviado! Verifique sua caixa de entrada (e spam).");
            window.location.href = "index.html"; 
        } else {
            alert("Erro ao enviar. Verifique se o e-mail está correto.");
        }
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro de conexão com o servidor.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
