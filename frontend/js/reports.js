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

    previewReport();
});

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