const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;
let allCategories = [];
let expensesChart = null;;
let editingTransactionId = null;

document.addEventListener("DOMContentLoaded", () => {

    const yearInput = document.getElementById("year");
    const monthInput = document.getElementById("month");

    if (yearInput) yearInput.value = currentYear;
    if (monthInput) monthInput.value = currentMonth;

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    loadAvailableYears().then(() => {
        loadCategories().then(() => {
            loadDashboard();
            loadTransactions();
            loadExpensesChart();
            loadUserData();
            setupSettingsEvents();
            setupMoneyInput();
        });
    });

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

async function loadAvailableYears() {
    const token = getToken();
    const yearSelect = document.getElementById("year");

    if (!yearSelect) return;

    try {
        const response = await apiFetch(`/api/transactions/years`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const years = await response.json();

            yearSelect.innerHTML = "";

            if (years.length === 0) {
                const option = document.createElement("option");
                option.value = currentYear;
                option.text = currentYear;
                yearSelect.appendChild(option);
            } else {
                years.forEach(year => {
                    const option = document.createElement("option");
                    option.value = year;
                    option.text = year;
                    yearSelect.appendChild(option);
                });
            }

            if (years.length > 0 && !years.includes(currentYear)) {
                currentYear = years[0];
            }

            yearSelect.value = currentYear;
        }
    } catch (error) {
        console.error("Erro ao carregar anos:", error);
        const option = document.createElement("option");
        option.value = currentYear;
        option.text = currentYear;
        yearSelect.appendChild(option);
    }
}

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/api/dashboard/summary?year=${currentYear}&month=${currentMonth}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        const data = await response.json();

        const income = data.totalIncome || 0;
        const expense = data.totalExpenses || 0;
        const balance = data.balance || 0;

        document.getElementById("total-income").innerText = `R$ ${income.toFixed(2)}`;
        document.getElementById("total-expense").innerText = `R$ ${expense.toFixed(2)}`;
        document.getElementById("total-balance").innerText = `R$ ${balance.toFixed(2)}`;

    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
    }
}

async function loadTransactions() {
    const token = getToken();

    try {
        const response = await fetch(
            `${API_URL}/api/transactions?year=${currentYear}&month=${currentMonth}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        const data = await response.json();

        const tableBody = document.getElementById("transactionsTable");
        const listContainer = document.getElementById("recent-transactions-list");

        if (tableBody) {
            tableBody.innerHTML = "";
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-stone-500">Nenhuma transação neste período.</td></tr>';
            }

            data.forEach(t => {
                const tr = document.createElement("tr");
                tr.className = "border-b hover:bg-gray-50";
                const typeClass = t.type === 'INCOME' ? 'text-green-600' : 'text-red-600';
                const typeLabel = t.type === 'INCOME' ? 'Receita' : 'Despesa';
                const symbol = t.type === 'INCOME' ? '+' : '-';

                const formattedDate = formatDate(t.date);
                const formattedValue = formatCurrency(t.amount);
                const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");

                tr.innerHTML = `
                    <td class="p-2 text-stone-600 text-sm">${formattedDate}</td>
                    <td class="p-2 font-medium text-stone-800">${t.description}</td>
                    <td class="p-2 text-sm text-stone-500">${t.category ? t.category.name : 'Sem Categoria'}</td>
                    <td class="p-2 font-bold text-xs uppercase ${typeClass}">${typeLabel}</td>
                    <td class="p-2 font-mono font-bold ${typeClass}">${symbol} ${formattedValue}</td>
                    <td class="p-2 text-center">
                         <button onclick='openEditModal(${safeTransaction})' class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase hover:underline">Editar</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        if (listContainer) {
            listContainer.innerHTML = "";
            if (data.length === 0) {
                listContainer.innerHTML = '<li class="py-4 text-stone-500 text-sm text-center italic">Nenhuma transação recente.</li>';
            }
            data.slice(0, 5).forEach(t => {
                const li = document.createElement("li");
                li.className = "py-3 flex justify-between items-center group";
                const isIncome = t.type === 'INCOME';
                const symbol = isIncome ? '+' : '-';
                const formattedDate = formatDate(t.date);
                const formattedValue = formatCurrency(t.amount);
                const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");
                li.innerHTML = `
                    <div class="flex items-center gap-3">
                         <div class="bg-stone-100 p-2 rounded-lg text-lg w-10 h-10 flex items-center justify-center text-stone-600">
                            ${t.category && t.category.icon ? t.category.icon : '📄'}
                         </div>
                        <div>
                            <p class="text-sm font-bold text-stone-800 truncate max-w-[120px]" title="${t.description}">${t.description}</p>
                            <p class="text-xs text-stone-500">${formattedDate}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}">
                            ${symbol} ${formattedValue}
                        </span>
                        <button onclick='openEditModal(${safeTransaction})' class="p-2 text-stone-300 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="Editar">
                            ✎
                        </button>
                    </div>
                `;
                listContainer.appendChild(li);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar transações:", e);
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
        document.getElementById("categoryId").value = transaction.category.id;
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

function openCategoryModal() {
    document.getElementById("categoryModal").classList.remove("hidden");
    document.getElementById("catName").value = "";
    document.getElementById("catIcon").value = "";
}

function closeCategoryModal() {
    document.getElementById("categoryModal").classList.add("hidden");
}

async function createCategory() {
    const token = getToken();
    const name = document.getElementById("catName").value;
    const type = document.getElementById("catType").value;
    const icon = document.getElementById("catIcon").value || "📃";

    if (!name) {
        showToast("Digite um nome para a categoria!", "error");
        return;
    }

    const body = { name, type, icon };

    try {
        const response = await apiFetch(`/api/categories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            showToast("Categoria criada com sucesso!", "success");
            closeCategoryModal();
            await loadCategories();
            filterCategoriesByType();
        } else {
            showToast("Erro ao criar categoria", "error");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

async function loadCategories() {
    const token = getToken();

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
            
            if (typeof loadDashboard === "function") loadDashboard();
            if (typeof loadTransactions === "function") {
                loadTransactions(); 
            }
            if (typeof loadExpensesChart === "function") loadExpensesChart();
            
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}

function applyFilter() {
    const yearVal = document.getElementById("year").value;
    const monthVal = document.getElementById("month").value;

    if (yearVal && monthVal) {
        currentYear = parseInt(yearVal);
        currentMonth = parseInt(monthVal);

        loadDashboard();
        loadTransactions();
        loadExpensesChart();
    } else {
        showToast("Por favor selecione ano e mês.", "error");
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

async function loadExpensesChart() {
    const token = getToken();
    const ctx = document.getElementById("expensesChart").getContext("2d");

    if (expensesChart) {
        expensesChart.destroy();
    }

    try {
        const response = await fetch(
            `${API_URL}/api/dashboard/expenses-by-category?year=${currentYear}&month=${currentMonth}`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        const data = await response.json();

        if (data.length === 0) {
            expensesChart = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["Sem dados"],
                    datasets: [{ data: [1], backgroundColor: ['#E5E7EB'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            return;
        }

        const labels = data.map(item => item.category);
        const values = data.map(item => item.total);

        expensesChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#a017c6', '#ff7c02', '#9aff02', '#0278ff69'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
    } catch (e) {
        console.error("Erro no gráfico", e);
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
