document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    }

    const now = new Date();
    loadTransactions(now.getFullYear(), now.getMonth() + 1);
});

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
            tr.className = "border-b border-stone-100 hover:bg-stone-50";

            const isIncome = t.type === 'INCOME';
            const colorClass = isIncome ? 'text-green-700' : 'text-red-700';
            const typeLabel = isIncome ? 'Receita' : 'Despesa';

            const dateParts = t.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            tr.innerHTML = `
                <td class="p-4 text-stone-600">${formattedDate}</td>
                <td class="p-4 font-medium">${t.description}</td>
                <td class="p-4"><span class="bg-stone-100 px-2 py-1 rounded text-xs text-stone-600">${t.category ? t.category.name : '-'}</span></td>
                <td class="p-4"><span class="${isIncome ? 'bg-green-100' : 'bg-red-100'} px-2 py-1 rounded text-xs font-bold ${colorClass}">${typeLabel}</span></td>
                <td class="p-4 text-right font-mono font-bold ${colorClass}">R$ ${t.amount.toFixed(2)}</td>
                <td class="p-4 text-center">
                    <button onclick="deleteTransaction(${t.id})" class="text-red-500 hover:text-red-700 font-bold text-xs uppercase">Excluir</button>
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
