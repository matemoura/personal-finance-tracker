let allCategories = [];
let editingTransactionId = null;

const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;

let allTransactions = [];
let currentPage = 1;
const PAGE_SIZE = 10;

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
    setupMoneyInput();

    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    if (prevBtn) prevBtn.addEventListener("click", () => changePage(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => changePage(1));

    loadTransactions(currentYear, currentMonth);

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

                const response = await apiFetch(`/api/users/upload-photo`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    const newPhotoUrl = await response.text();
                    localStorage.setItem("userPhoto", newPhotoUrl);

                    document.getElementById("user-avatar").src = newPhotoUrl;
                    if (preview) preview.src = newPhotoUrl;

                    showToast("Foto atualizada!", "success");
                } else {
                    showToast("Erro ao enviar foto.", "error");
                }
            } catch (error) {
                console.error(error);
                showToast("Erro de conexão.", "error");
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
        showToast("Preencha todos os campos.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("A nova senha e a confirmação não coincidem.", "error");
        return;
    }

    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!regex.test(newPassword)) {
        showToast("A nova senha deve ter no mínimo 8 caracteres, contendo letra, número e caractere especial (@$!%*#?&).", "error");
        return;
    }

    const token = localStorage.getItem("token");
    try {
        const response = await apiFetch(`/api/users/change-password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (response.ok) {
            showToast("Senha alterada com sucesso!", "success");
            closeSettingsModal();
        } else {
            showToast("Erro ao alterar senha. Verifique a senha atual.", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
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
        const response = await apiFetch(`/api/transactions?year=${year}&month=${month}`);

        if (!response.ok) throw new Error("Erro ao buscar transações");

        allTransactions = await response.json();
        currentPage = 1;
        renderTransactionsPage();

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar dados.</td></tr>';
        document.getElementById("pagination").classList.add("hidden");
    }
}

function renderTransactionsPage() {
    const tbody = document.getElementById("transactions-body");
    const pagination = document.getElementById("pagination");
    tbody.innerHTML = "";

    if (allTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-stone-500">Nenhuma transação encontrada neste mês.</td></tr>';
        pagination.classList.add("hidden");
        return;
    }

    const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allTransactions.slice(start, start + PAGE_SIZE);

    pageItems.forEach(t => {
        const tr = document.createElement("tr");
        tr.className = "border-b border-stone-100 hover:bg-stone-50 transition";

        const isIncome = t.type === 'INCOME';
        const colorClass = isIncome ? 'text-green-700' : 'text-red-700';
        const typeLabel = isIncome ? 'Receita' : 'Despesa';
        const formattedDate = formatDate(t.date);
        const formattedValue = formatCurrency(t.amount);
        const symbol = isIncome ? '+' : '-';

        const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");

        tr.innerHTML = `
            <td class="p-4 text-stone-600">${formattedDate}</td>
            <td class="p-4 font-medium">${t.description}</td>
            <td class="p-4"><span class="bg-stone-100 px-2 py-1 rounded text-xs text-stone-600">${t.category ? t.category.name : '-'}</span></td>
            <td class="p-4"><span class="${isIncome ? 'bg-green-100' : 'bg-red-100'} px-2 py-1 rounded text-xs font-bold ${colorClass}">${typeLabel}</span></td>

            <td class="p-4 text-right font-mono font-bold ${colorClass}">
                ${symbol} ${formattedValue}
            </td>
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

    if (totalPages > 1) {
        pagination.classList.remove("hidden");
        document.getElementById("page-info").textContent =
            `Página ${currentPage} de ${totalPages} (${allTransactions.length} transações)`;
        document.getElementById("prev-page").disabled = currentPage === 1;
        document.getElementById("next-page").disabled = currentPage === totalPages;
    } else {
        pagination.classList.add("hidden");
    }
}

function changePage(delta) {
    currentPage += delta;
    renderTransactionsPage();
}

async function deleteTransaction(id) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    const token = localStorage.getItem("token");
    try {
        const response = await apiFetch(`/api/transactions/${id}`, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            showToast("Transação excluída!", "success");
            loadTransactions(currentYear, currentMonth);
        } else {
            showToast("Erro ao excluir.", "error");
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
        const response = await apiFetch(`/api/users/photo`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            localStorage.removeItem("userPhoto");

            const name = localStorage.getItem("userName");
            const defaultAvatar = `https://ui-avatars.com/api/?name=${name}&background=755c47&color=fff`;

            document.getElementById("user-avatar").src = defaultAvatar;
            document.getElementById("settings-avatar-preview").src = defaultAvatar;

            showToast("Foto removida com sucesso!", "success");
        } else {
            showToast("Erro ao remover foto.", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}

function openEditModal(transaction) {
    openModal(transaction);
}

async function loadCategories() {
    const token = localStorage.getItem("token");
    try {
        const response = await apiFetch(`/api/categories`, {
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
        document.getElementById("amount").value = formatCurrency(transaction.amount);
        document.getElementById("date").value = transaction.date;
        document.getElementById("type").value = transaction.type;

        filterCategoriesByType();

        setTimeout(() => {
            if (transaction.category) {
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
    const amount = parseCurrencyInput(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const categoryId = document.getElementById("categoryId").value;

    if (!description || !amount || !date || !categoryId) {
        showToast("Preencha todos os campos!", "error");
        return;
    }

    const body = { description, amount, date, type, categoryId };

    try {
        let response;
        if (editingTransactionId) {
            response = await apiFetch(`/api/transactions/${editingTransactionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(body)
            });
        } else {
            response = await apiFetch(`/api/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(body)
            });
        }

        if (response.ok) {
            showToast(editingTransactionId ? "Transação atualizada!" : "Transação criada!", "success");
            closeModal();
            loadTransactions(currentYear, currentMonth);
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}

