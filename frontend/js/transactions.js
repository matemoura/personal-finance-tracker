let allCategories = [];
let editingTransactionId = null;

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }

    loadUserData();
    setupSettingsEvents();
    loadCategories();

    const now = new Date();
    loadTransactions(now.getFullYear(), now.getMonth() + 1);

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

async function loadTransactions(year, month) {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const tbody = document.getElementById("transactions-body");

    try {
        const response = await fetch(`${API_URL}/api/transactions?year=${year}&month=${month}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Erro ao buscar transações");

        const data = await response.json();
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-stone-500">Nenhuma transação encontrada neste mês.</td></tr>';
            return;
        }

        data.forEach(t => {
            const tr = document.createElement("tr");
            tr.className = "border-b border-stone-100 hover:bg-stone-50 transition";

            const isIncome = t.type === 'INCOME';
            const colorClass = isIncome ? 'text-green-700' : 'text-red-700';
            const typeLabel = isIncome ? 'Receita' : 'Despesa';
            const dateParts = t.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");

            tr.innerHTML = `
                <td class="p-4 text-stone-600">${formattedDate}</td>
                <td class="p-4 font-medium">${t.description}</td>
                <td class="p-4"><span class="bg-stone-100 px-2 py-1 rounded text-xs text-stone-600">${t.category ? t.category.name : '-'}</span></td>
                <td class="p-4"><span class="${isIncome ? 'bg-green-100' : 'bg-red-100'} px-2 py-1 rounded text-xs font-bold ${colorClass}">${typeLabel}</span></td>
                <td class="p-4 text-right font-mono font-bold ${colorClass}">R$ ${t.amount.toFixed(2)}</td>
                <td class="p-4 text-center space-x-2">
                    <button onclick='openEditModal(${safeTransaction})' class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase px-2 py-1 hover:bg-blue-50 rounded transition">
                        Editar
                    </button>
                    <button onclick="deleteTransaction(${t.id})" class="text-red-500 hover:text-red-700 font-bold text-xs uppercase px-2 py-1 hover:bg-red-50 rounded transition">
                        Excluir
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar dados.</td></tr>';
    }
}

async function deleteTransaction(id) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            alert("Transação excluída!");
            location.reload();
        } else {
            alert("Erro ao excluir.");
        }
    } catch (error) {
        console.error(error);
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

function openEditModal(transaction) {
    openModal(transaction);
}

async function loadCategories() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            allCategories = await response.json();
        }
    } catch (error) {
        console.error("Erro ao carregar categorias:", error);
    }
}

function openModal(transaction = null) {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");

    if (transaction) {
        editingTransactionId = transaction.id;
        document.getElementById("modal-title").innerText = "Editar Transação";
        document.getElementById("description").value = transaction.description;
        document.getElementById("amount").value = transaction.amount;
        document.getElementById("date").value = transaction.date;
        document.getElementById("type").value = transaction.type;
        
        filterCategoriesByType(); 

        setTimeout(() => {
             if(transaction.category) {
                 document.getElementById("categoryId").value = transaction.category.id;
             }
        }, 50);
        
    } else {
        editingTransactionId = null;
        document.getElementById("modal-title").innerText = "Nova Transação";
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").valueAsDate = new Date();
        document.getElementById("type").value = "EXPENSE";
        filterCategoriesByType();
    }
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

function filterCategoriesByType() {
    const selectedType = document.getElementById("type").value;
    const select = document.getElementById("categoryId");
    select.innerHTML = "";

    const filtered = allCategories.filter(c => c.type === selectedType);

    if (filtered.length === 0) {
        const option = document.createElement("option");
        option.text = "Nenhuma categoria deste tipo";
        option.disabled = true;
        option.selected = true;
        select.appendChild(option);
        return;
    }

    filtered.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.text = `${c.icon || '📃'} ${c.name}`;
        select.appendChild(option);
    });
}

async function createTransaction() {
    const token = localStorage.getItem("token");
    const description = document.getElementById("description").value;
    const amount = document.getElementById("amount").value;
    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const categoryId = document.getElementById("categoryId").value;

    if (!description || !amount || !date || !categoryId) {
        alert("Preencha todos os campos!");
        return;
    }

    const body = { description, amount, date, type, categoryId };

    try {
        let response;
        if (editingTransactionId) {
            response = await fetch(`${API_URL}/api/transactions/${editingTransactionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(body)
            });
        } else {
            response = await fetch(`${API_URL}/api/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(body)
            });
        }

        if (response.ok) {
            alert(editingTransactionId ? "Transação atualizada!" : "Transação criada!");
            closeModal();
            location.reload(); 
        } else {
            const err = await response.json();
            alert("Erro: " + (err.message || "Falha ao salvar."));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}
