const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;
let allCategories = [];
let expensesChart = null;;

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

async function loadAvailableYears() {
    const token = getToken();
    const yearSelect = document.getElementById("year");

    if (!yearSelect) return;

    try {
        const response = await fetch(`${API_URL}/api/transactions/years`, {
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

        if (response.status === 403) {
            logout();
            return;
        }

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

                const dateParts = t.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                tr.innerHTML = `
                    <td class="p-2">${formattedDate}</td>
                    <td class="p-2">${t.description}</td>
                    <td class="p-2">${t.category ? t.category.name : 'Sem Categoria'}</td>
                    <td class="p-2 font-bold ${typeClass}">${typeLabel}</td>
                    <td class="p-2 font-bold ${typeClass}">R$ ${t.amount}</td>
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
                li.className = "py-3 flex justify-between items-center";
                const isIncome = t.type === 'INCOME';
                const dateParts = t.date.split('-');
                li.innerHTML = `
                    <div>
                        <p class="text-sm font-medium text-stone-800">${t.description}</p>
                        <p class="text-xs text-stone-500">${dateParts[2]}/${dateParts[1]}/${dateParts[0]}</p>
                    </div>
                    <span class="font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}">
                        ${isIncome ? '+' : '-'} R$ ${t.amount}
                    </span>
                `;
                listContainer.appendChild(li);
            });
        }
    } catch (e) {
        console.error("Erro transações", e);
    }
}

function openModal() {
    document.getElementById("modal").classList.remove("hidden");
    document.getElementById("date").valueAsDate = new Date();
    document.getElementById("type").value = "INCOME";
    filterCategoriesByType();
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
        alert("Digite um nome para a categoria!");
        return;
    }

    const body = { name, type, icon };

    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert("Categoria criada com sucesso!");
            closeCategoryModal();
            await loadCategories();
        } else {
            alert("Erro ao criar categoria");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

async function loadCategories() {
    const token = getToken();

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
    const token = getToken();
    const categorySelect = document.getElementById("categoryId");

    if (!categorySelect.value) {
        alert("Selecione uma categoria!");
        return;
    }

    const body = {
        description: document.getElementById("description").value,
        amount: document.getElementById("amount").value,
        date: document.getElementById("date").value,
        type: document.getElementById("type").value,
        categoryId: categorySelect.value
    };

    const response = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        alert("Erro ao salvar: " + err);
        return;
    }

    alert("Transação salva!");
    closeModal();

    loadDashboard();
    loadTransactions();
    loadExpensesChart();
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
        alert("Por favor selecione ano e mês.");
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
