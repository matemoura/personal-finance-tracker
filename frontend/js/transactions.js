let allCategories = [];
let editingTransactionId = null;

const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;

let allTransactions = [];
let currentPage = 1;
const PAGE_SIZE = 10;

let currentType = "";
let currentCategoryFilter = "";

const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    setupSettingsEvents();
    loadCategories();
    setupMoneyInput();

    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");
    if (prevBtn) prevBtn.addEventListener("click", () => changePage(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => changePage(1));

    const monthSelect = document.getElementById("filter-month");
    if (monthSelect) monthSelect.value = currentMonth;
    loadAvailableYears();

    loadTransactions(currentYear, currentMonth);

    document.addEventListener('click', function (event) {
        const menu = document.getElementById("user-menu");
        if (menu && !menu.classList.contains("hidden") &&
            !menu.contains(event.target) && !event.target.closest("[data-user-trigger]")) {
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

    const isPhoto = tab === 'photo';
    photoContent.classList.toggle("hidden", !isPhoto);
    passContent.classList.toggle("hidden", isPhoto);
    tabPhoto.classList.toggle("tab-active", isPhoto);
    tabPass.classList.toggle("tab-active", !isPhoto);
}

function setAvatarEverywhere(src) {
    ["user-avatar", "user-avatar-mobile"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = src;
    });
}

function setupSettingsEvents() {
    const photoInput = document.getElementById('modal-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);

            try {
                const preview = document.getElementById("settings-avatar-preview");
                if (preview) preview.style.opacity = "0.5";

                const response = await apiFetch(`/api/users/upload-photo`, {
                    method: "POST",
                    body: formData
                });

                if (response.ok) {
                    const newPhotoUrl = await response.text();
                    localStorage.setItem("userPhoto", newPhotoUrl);

                    setAvatarEverywhere(newPhotoUrl);
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

    try {
        const response = await apiFetch(`/api/users/change-password`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const tbody = document.getElementById("transactions-body");

    try {
        let query = `/api/transactions?year=${year}&month=${month}`;
        if (currentType) query += `&type=${currentType}`;
        if (currentCategoryFilter) query += `&categoryId=${currentCategoryFilter}`;

        const response = await apiFetch(query);

        if (!response.ok) throw new Error("Erro ao buscar transações");

        allTransactions = await response.json();
        currentPage = 1;
        renderTransactionsPage();

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-600">Erro ao carregar dados.</td></tr>';
        document.getElementById("pagination").classList.add("hidden");
    }
}

function renderTransactionsPage() {
    const tbody = document.getElementById("transactions-body");
    const pagination = document.getElementById("pagination");
    const countLabel = document.getElementById("count-label");
    tbody.innerHTML = "";

    if (countLabel) {
        countLabel.textContent = `${allTransactions.length} ${allTransactions.length === 1 ? "transação" : "transações"} em ${MONTHS_LONG[currentMonth - 1]} de ${currentYear}`;
    }

    if (allTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center" style="color:#9daebf">Nenhuma transação encontrada neste período.</td></tr>';
        pagination.classList.add("hidden");
        return;
    }

    const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allTransactions.slice(start, start + PAGE_SIZE);

    pageItems.forEach(t => {
        const tr = document.createElement("tr");
        tr.className = "table-row transition";

        const isIncome = t.type === 'INCOME';
        const typeLabel = isIncome ? 'Receita' : 'Despesa';
        const formattedDate = formatDate(t.date);
        const formattedValue = formatCurrency(t.amount);
        const symbol = isIncome ? '+' : '−';

        const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");

        tr.innerHTML = `
            <td class="px-[18px] py-[13px] whitespace-nowrap" style="color:var(--app-muted)">${formattedDate}</td>
            <td class="px-[18px] py-[13px] font-semibold" style="color:var(--app-heading)">${t.description}</td>
            <td class="px-[18px] py-[13px]"><span class="category-pill text-[11px] font-semibold px-[9px] py-[3px] rounded-xl">${t.category ? t.category.name : '-'}</span></td>
            <td class="px-[18px] py-[13px]"><span class="${isIncome ? 'pill-income' : 'pill-expense'} text-[11px] font-bold px-[9px] py-[3px] rounded-xl">${typeLabel}</span></td>
            <td class="px-[18px] py-[13px] text-right font-bold whitespace-nowrap" style="color:${isIncome ? 'var(--app-success)' : 'var(--app-heading)'}">
                ${symbol} R$ ${formattedValue}
            </td>
            <td class="px-[18px] py-[13px] text-center whitespace-nowrap">
                <button onclick='openEditModal(${safeTransaction})' title="Editar"
                    class="px-1.5 py-1 text-[13px] transition hover:!text-[#3b82c4]" style="color:#9daebf">✎</button>
                <button onclick="deleteTransaction(${t.id})" title="Excluir"
                    class="px-1.5 py-1 text-[13px] transition hover:!text-red-600" style="color:#9daebf">🗑</button>
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

    try {
        const response = await apiFetch(`/api/transactions/${id}`, {
            method: 'DELETE'
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

    const nameElement = document.getElementById("user-name-display");
    if (name && nameElement) {
        const parts = name.trim().split(/\s+/);
        let displayName = name;
        if (parts.length > 1) {
            displayName = `${parts[0]} ${parts[parts.length - 1]}`;
        }
        nameElement.textContent = displayName;
    }

    if (photo) {
        setAvatarEverywhere(photo);
    } else if (name) {
        setAvatarEverywhere(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82c4&color=fff`);
    }
}

async function deletePhoto() {
    if (!confirm("Tem certeza que deseja remover sua foto de perfil?")) return;

    try {
        const response = await apiFetch(`/api/users/photo`, {
            method: "DELETE"
        });

        if (response.ok) {
            localStorage.removeItem("userPhoto");

            const name = localStorage.getItem("userName");
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=3b82c4&color=fff`;

            setAvatarEverywhere(defaultAvatar);
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
    try {
        const response = await apiFetch(`/api/categories`);
        if (response.ok) {
            allCategories = await response.json();
            populateCategoryFilter();
        }
    } catch (error) {
        console.error("Erro ao carregar categorias:", error);
    }
}

function populateCategoryFilter() {
    const select = document.getElementById("filter-category");
    if (!select) return;

    select.innerHTML = '<option value="">Todas</option>';
    allCategories.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.text = `${c.icon || '📃'} ${c.name}`;
        select.appendChild(option);
    });
}

async function loadAvailableYears() {
    const yearSelect = document.getElementById("filter-year");
    if (!yearSelect) return;

    const fillFallback = () => {
        yearSelect.innerHTML = "";
        const option = document.createElement("option");
        option.value = currentYear;
        option.text = currentYear;
        yearSelect.appendChild(option);
    };

    try {
        const response = await apiFetch(`/api/transactions/years`);
        if (!response.ok) {
            fillFallback();
            return;
        }

        const years = await response.json();
        yearSelect.innerHTML = "";

        if (years.length === 0) {
            fillFallback();
        } else {
            years.forEach(year => {
                const option = document.createElement("option");
                option.value = year;
                option.text = year;
                yearSelect.appendChild(option);
            });
            if (!years.includes(currentYear)) currentYear = years[0];
        }

        yearSelect.value = currentYear;
    } catch (error) {
        console.error("Erro ao carregar anos:", error);
        fillFallback();
    }
}

function applyTransactionFilters() {
    currentYear = parseInt(document.getElementById("filter-year").value);
    currentMonth = parseInt(document.getElementById("filter-month").value);
    currentType = document.getElementById("filter-type").value;
    currentCategoryFilter = document.getElementById("filter-category").value;
    loadTransactions(currentYear, currentMonth);
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        } else {
            response = await apiFetch(`/api/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}
