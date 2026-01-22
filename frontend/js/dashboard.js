async function loadDashboard() {
    const token = getToken();

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    let currentYear;
    let currentMonth;

    const response = await fetch(
        `${API_URL}/api/dashboard/summary?year=${currentYear}&month=${currentMonth}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    document.getElementById("income").innerText = data.totalIncome;
    document.getElementById("expense").innerText = data.totalExpense;
    document.getElementById("balance").innerText = data.balance;
}

async function loadTransactions() {
    const token = getToken();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const response = await fetch(
        `${API_URL}/api/transactions?year=${currentYear}&month=${currentMonth}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    const tbody = document.getElementById("transactionsTable");
    tbody.innerHTML = "";

    data.forEach(t => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.description}</td>
      <td>${t.category.name}</td>
      <td>${t.type}</td>
      <td>${t.amount}</td>
    `;

        tbody.appendChild(tr);
    });
}

async function createTransaction() {
    const token = getToken();

    const body = {
        description: document.getElementById("description").value,
        amount: document.getElementById("amount").value,
        date: document.getElementById("date").value,
        type: document.getElementById("type").value,
        categoryId: document.getElementById("categoryId").value
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

    loadDashboard();
    loadTransactions();
}

function applyFilter() {
    currentYear = document.getElementById("year").value;
    currentMonth = document.getElementById("month").value;

    loadDashboard();
    loadTransactions();
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

loadDashboard();
