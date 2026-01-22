const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;

document.addEventListener("DOMContentLoaded", () => {
    const yearInput = document.getElementById("year");
    const monthInput = document.getElementById("month");
    
    if(yearInput) yearInput.value = currentYear;
    if(monthInput) monthInput.value = currentMonth;
});

let expensesChart = null;

function openModal() {
    document.getElementById("modal").classList.remove("hidden");
    document.getElementById("date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

async function loadCategories() {
    const token = getToken();
    
    try {
        const response = await fetch(`${API_URL}/api/categories`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById("categoryId");
            select.innerHTML = ""; 
            
            const defaultOption = document.createElement("option");
            defaultOption.text = "Selecione uma categoria";
            defaultOption.value = "";
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);

            data.forEach(c => {
                const option = document.createElement("option");
                option.value = c.id;
                option.text = c.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar categorias:", error);
    }
}

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const response = await fetch(
        `${API_URL}/api/dashboard/summary?year=${currentYear}&month=${currentMonth}`,
        { headers: { "Authorization": `Bearer ${token}` } }
    );

    if (response.status === 403) {
        logout();
        return;
    }

    const data = await response.json();

    document.getElementById("income").innerText = `R$ ${data.totalIncome}`;
    document.getElementById("expense").innerText = `R$ ${data.totalExpense}`;
    document.getElementById("balance").innerText = `R$ ${data.balance}`;
}

async function loadTransactions() {
    const token = getToken();

    const response = await fetch(
        `${API_URL}/api/transactions?year=${currentYear}&month=${currentMonth}`,
        { headers: { "Authorization": `Bearer ${token}` } }
    );

    const data = await response.json();
    const tbody = document.getElementById("transactionsTable");
    tbody.innerHTML = "";

    data.forEach(t => {
        const tr = document.createElement("tr");
        tr.className = "border-b hover:bg-gray-50";

        const typeClass = t.type === 'INCOME' ? 'text-green-600' : 'text-red-600';
        const typeLabel = t.type === 'INCOME' ? 'Receita' : 'Despesa';

        tr.innerHTML = `
            <td class="p-2">${t.date}</td>
            <td class="p-2">${t.description}</td>
            <td class="p-2">${t.category.name}</td>
            <td class="p-2 font-bold ${typeClass}">${typeLabel}</td>
            <td class="p-2 font-bold ${typeClass}">R$ ${t.amount}</td>
        `;
        tbody.appendChild(tr);
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
        alert("Erro ao salvar transação");
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
        currentYear = yearVal;
        currentMonth = monthVal;
        
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

    const response = await fetch(
        `${API_URL}/api/dashboard/expenses-by-category?year=${currentYear}&month=${currentMonth}`,
        { headers: { "Authorization": `Bearer ${token}` } }
    );

    const data = await response.json();

    const labels = data.map(item => item.category);
    const values = data.map(item => item.total);

    const ctx = document.getElementById("expensesChart").getContext("2d");

    if (expensesChart) {
        expensesChart.destroy();
    }

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
}

loadCategories();
loadDashboard();
loadTransactions();
loadExpensesChart();
