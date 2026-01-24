async function doReset() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const newPassword = document.getElementById('newPass').value;

    if (!token) {
        alert("Link inválido ou expirado. Solicite novamente.");
        return;
    }

    if (!newPassword) {
        alert("Digite a nova senha.");
        return;
    }

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    
    if (!regex.test(newPassword)) {
        alert("A senha deve ter no mínimo 8 caracteres, contendo letra, número e caractere especial.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/reset-password?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword })
        });

        if (response.ok) {
            alert("Senha alterada com sucesso! Faça login agora.");
            window.location.href = "index.html";
        } else {
            const errorMsg = await response.text();
            alert("Erro: " + errorMsg);
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}
