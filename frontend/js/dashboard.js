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
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }

    loadAvailableYears().then(() => {
        loadCategories().then(() => {
            loadDashboard();
            loadTransactions();
            loadExpensesChart();
        });
    });
});

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
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                li.innerHTML = `
                    <div>
                        <p class="text-sm font-medium text-stone-800">${t.description}</p>
                        <p class="text-xs text-stone-500">${formattedDate}</p>
                    </div>
                    <span class="font-bold text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}">
                        ${isIncome ? '+' : '-'} R$ ${t.amount}
                    </span>
                `;
                listContainer.appendChild(li);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar transações", e);
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
                    backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6'],
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
