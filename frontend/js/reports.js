document.addEventListener("DOMContentLoaded", () => {
    const now = new Date();
    document.getElementById("report-year").value = now.getFullYear();
    document.getElementById("report-month").value = now.getMonth() + 1;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }

    loadUserData();
    setupSettingsEvents();
    previewReport();

    document.addEventListener('click', function (event) {
        const menu = document.getElementById("user-menu");
        const avatarBtn = document.getElementById("user-avatar");
        if (menu && !menu.classList.contains("hidden") && !menu.contains(event.target) && !avatarBtn.contains(event.target)) {
            menu.classList.add("hidden");
        }
    });
});

function toggleUserMenu() {
    const menu = document.getElementById("user-menu");
    if (menu) menu.classList.toggle("hidden");
}

function openSettingsModal() {
    document.getElementById("settings-modal").classList.remove("hidden");
    document.getElementById("user-menu").classList.add("hidden");

    const currentSrc = document.getElementById("user-avatar").src;
    const preview = document.getElementById("settings-avatar-preview");
    if (preview) preview.src = currentSrc;
}

function closeSettingsModal() {
    document.getElementById("settings-modal").classList.add("hidden");
    const ids = ["current-password", "new-password", "confirm-password"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function switchTab(tab) {
    const photoContent = document.getElementById("content-photo");
    const passContent = document.getElementById("content-password");
    const tabPhoto = document.getElementById("tab-photo");
    const tabPass = document.getElementById("tab-password");

    if (tab === 'photo') {
        photoContent.classList.remove("hidden");
        passContent.classList.add("hidden");

        tabPhoto.classList.add("border-b-2", "border-brown-800", "bg-brown-50/50", "text-brown-800");
        tabPhoto.classList.remove("text-brown-500");

        tabPass.classList.remove("border-b-2", "border-brown-800", "bg-brown-50/50", "text-brown-800");
        tabPass.classList.add("text-brown-500");
    } else {
        photoContent.classList.add("hidden");
        passContent.classList.remove("hidden");

        tabPass.classList.add("border-b-2", "border-brown-800", "bg-brown-50/50", "text-brown-800");
        tabPass.classList.remove("text-brown-500");

        tabPhoto.classList.remove("border-b-2", "border-brown-800", "bg-brown-50/50", "text-brown-800");
        tabPhoto.classList.add("text-brown-500");
    }
}

function setupSettingsEvents() {
    const photoInput = document.getElementById('modal-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);
            const token = localStorage.getItem("token");

            try {
                const preview = document.getElementById("settings-avatar-preview");
                if (preview) preview.style.opacity = "0.5";

                const response = await fetch(`${API_URL}/api/users/upload-photo`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    const newPhotoUrl = await response.text();
                    localStorage.setItem("userPhoto", newPhotoUrl);

                    document.getElementById("user-avatar").src = newPhotoUrl;
                    if (preview) preview.src = newPhotoUrl;

                    alert("Foto atualizada!");
                } else {
                    alert("Erro ao enviar foto.");
                }
            } catch (error) {
                console.error(error);
                alert("Erro de conexão.");
            } finally {
                const preview = document.getElementById("settings-avatar-preview");
                if (preview) preview.style.opacity = "1";
            }
        });
    }
}

async function saveNewPassword() {
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (!currentPassword || !newPassword) {
        alert("Preencha todos os campos.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("A nova senha e a confirmação não coincidem.");
        return;
    }

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!regex.test(newPassword)) {
        alert("A nova senha deve ter no mínimo 8 caracteres, contendo letra, número e caractere especial (@$!%*#?&).");
        return;
    }

    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/users/change-password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            alert("Senha alterada com sucesso!");
            closeSettingsModal();
        } else {
            alert("Erro ao alterar senha. Verifique a senha atual.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}

async function previewReport() {
    const year = document.getElementById("report-year").value;
    const month = document.getElementById("report-month").value;
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("preview-date").innerText = `${month}/${year}`;
    const tbody = document.getElementById("report-preview-body");
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Carregando...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/api/transactions?year=${year}&month=${month}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Falha ao buscar dados");

        const data = await response.json();

        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-stone-500">Nenhuma transação encontrada neste período.</td></tr>';
            return;
        }

        data.forEach(t => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-stone-100 hover:bg-stone-50";

            const isIncome = t.type === 'INCOME';
            const colorClass = isIncome ? 'text-green-700' : 'text-red-700';
            const typeLabel = isIncome ? 'Receita' : 'Despesa';

            const dateParts = t.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            tr.innerHTML = `
                <td class="p-4 text-stone-600">${formattedDate}</td>
                <td class="p-4 font-medium">${t.description}</td>
                <td class="p-4"><span class="bg-stone-100 px-2 py-1 rounded text-xs text-stone-600">${t.category.name}</span></td>
                <td class="p-4"><span class="${isIncome ? 'bg-green-100' : 'bg-red-100'} px-2 py-1 rounded text-xs font-bold ${colorClass}">${typeLabel}</span></td>
                <td class="p-4 text-right font-mono font-bold ${colorClass}">R$ ${t.amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Erro ao carregar prévia.</td></tr>';
    }
}

async function downloadReport(type) {
    const year = document.getElementById("report-year").value;
    const month = document.getElementById("report-month").value;
    const token = localStorage.getItem("token");

    const endpoint = type === 'pdf' ? 'pdf' : 'excel';

    try {
        const response = await fetch(`${API_URL}/api/reports/${endpoint}?year=${year}&month=${month}`, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            alert("Erro ao gerar relatório. Verifique se há dados para este período.");
            return;
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const extension = type === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `Relatorio_Financeiro_${month}_${year}.${extension}`;

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        a.remove();

    } catch (error) {
        console.error("Erro no download:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

function loadUserData() {
    const name = localStorage.getItem("userName");
    const photo = localStorage.getItem("userPhoto");

    const nameElement = document.getElementById("user-name-display") || document.querySelector(".user-info");
    const avatarElement = document.getElementById("user-avatar");

    if (name && nameElement) {
        const parts = name.trim().split(/\s+/); 
        let displayName = name; 

        if (parts.length > 1) {
            displayName = `${parts[0]} ${parts[parts.length - 1]}`;
        }

        nameElement.textContent = `Olá, ${displayName}`;
    }

    if (avatarElement) {
        if (photo) {
            avatarElement.src = photo;
        } else if (name) {
            avatarElement.src = `https://ui-avatars.com/api/?name=${name}&background=755c47&color=fff`;
        }
    }
}

async function deletePhoto() {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;

    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/users/photo`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            localStorage.removeItem("userPhoto");
            
            const name = localStorage.getItem("userName");
            const defaultAvatar = `https://ui-avatars.com/api/?name=${name}&background=755c47&color=fff`;

            document.getElementById("user-avatar").src = defaultAvatar;
            document.getElementById("settings-avatar-preview").src = defaultAvatar;

            alert("Foto removida com sucesso!");
        } else {
            alert("Erro ao remover foto.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}
