const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;
let allCategories = [];
let editingTransactionId = null;

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

document.addEventListener("DOMContentLoaded", () => {
    const todayLabel = document.getElementById("today-label");
    if (todayLabel) {
        const formatted = new Intl.DateTimeFormat("pt-BR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        }).format(new Date());
        todayLabel.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    const prevBtn = document.getElementById("month-prev");
    const nextBtn = document.getElementById("month-next");
    if (prevBtn) prevBtn.addEventListener("click", () => stepMonth(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => stepMonth(1));
    updateMonthLabel();

    loadCategories().then(() => {
        refreshDashboard();
        loadUserData();
        setupSettingsEvents();
        setupMoneyInput();
        loadReceivable();
    });

    document.addEventListener('click', function (event) {
        const menu = document.getElementById("user-menu");
        if (menu && !menu.classList.contains("hidden") &&
            !menu.contains(event.target) && !event.target.closest("[data-user-trigger]")) {
            menu.classList.add("hidden");
        }
    });
});

function stepMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    updateMonthLabel();
    refreshDashboard();
}

function updateMonthLabel() {
    const label = document.getElementById("month-label");
    if (label) label.textContent = `${MONTHS_SHORT[currentMonth - 1]} ${currentYear}`;
}

function refreshDashboard() {
    loadDashboard();
    loadTransactions();
    loadCategoryBars();
    loadCharts();
}

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

async function fetchSummary(year, month) {
    const response = await apiFetch(`/api/dashboard/summary?year=${year}&month=${month}`);
    if (!response.ok) throw new Error("Falha ao carregar resumo");
    return response.json();
}

function lastMonths(count) {
    const months = [];
    let y = currentYear, m = currentMonth;
    for (let i = 0; i < count; i++) {
        months.unshift({ year: y, month: m });
        m--;
        if (m < 1) { m = 12; y--; }
    }
    return months;
}

async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    try {
        const prev = lastMonths(2)[0];
        const [data, prevData] = await Promise.all([
            fetchSummary(currentYear, currentMonth),
            fetchSummary(prev.year, prev.month).catch(() => null)
        ]);

        const income = data.totalIncome || 0;
        const expense = data.totalExpenses || 0;
        const balance = data.balance || 0;
        const monthBalance = income - expense;

        document.getElementById("total-income").innerText = `R$ ${formatCurrency(income)}`;
        document.getElementById("total-expense").innerText = `R$ ${formatCurrency(expense)}`;
        document.getElementById("month-balance").innerText = `R$ ${formatCurrency(monthBalance)}`;
        document.getElementById("total-balance").innerText = `R$ ${formatCurrency(balance)}`;

        const prevName = MONTHS_LONG[prev.month - 1];
        renderVariationBadge("income-badge", "income-vs", income, prevData ? prevData.totalIncome : null, prevName, true);
        renderVariationBadge("expense-badge", "expense-vs", expense, prevData ? prevData.totalExpenses : null, prevName, false);

        const savedBadge = document.getElementById("saved-badge");
        const savedBar = document.getElementById("saved-bar");
        if (income > 0) {
            const pct = Math.max(0, Math.min(100, Math.round((monthBalance / income) * 100)));
            savedBadge.textContent = `${pct}% poupado`;
            savedBadge.classList.remove("hidden");
            savedBar.style.width = `${pct}%`;
        } else {
            savedBadge.classList.add("hidden");
            savedBar.style.width = "0%";
        }

    } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
    }
}

async function loadReceivable() {
    const card = document.getElementById("total-receivable");
    if (!card) return;

    try {
        const response = await apiFetch(`/api/loans/summary`);
        if (!response.ok) throw new Error("Falha ao carregar empréstimos");

        const summary = await response.json();
        const badge = document.getElementById("receivable-badge");
        const note = document.getElementById("receivable-note");

        card.innerText = `R$ ${formatCurrency(summary.totalPending)}`;

        if (summary.pendingCount > 0) {
            badge.textContent = `${summary.pendingCount} pendente${summary.pendingCount > 1 ? "s" : ""}`;
            badge.classList.remove("hidden");
            note.textContent = "Clique para ver os detalhes";
        } else {
            badge.classList.add("hidden");
            note.textContent = "Nenhum empréstimo pendente";
        }
    } catch (error) {
        console.error("Erro ao carregar empréstimos:", error);
    }
}

function renderVariationBadge(badgeId, vsId, current, previous, prevMonthName, upIsGood) {
    const badge = document.getElementById(badgeId);
    const vs = document.getElementById(vsId);

    if (previous === null || previous === undefined || previous === 0) {
        badge.classList.add("hidden");
        vs.innerHTML = "&nbsp;";
        return;
    }

    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "−";
    badge.textContent = `${sign}${Math.abs(pct).toFixed(1).replace(".", ",")}%`;
    badge.classList.remove("hidden", "badge-up", "badge-down");
    const isGood = upIsGood ? pct >= 0 : pct < 0;
    badge.classList.add(isGood ? "badge-up" : "badge-down");

    vs.textContent = `vs. R$ ${formatCurrency(previous)} em ${prevMonthName}`;
}

async function loadTransactions() {
    try {
        const response = await apiFetch(`/api/transactions?year=${currentYear}&month=${currentMonth}`);
        const data = await response.json();

        const listContainer = document.getElementById("recent-transactions-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";
        if (data.length === 0) {
            listContainer.innerHTML = '<li class="py-6 text-center text-sm italic" style="color:#9daebf">Nenhuma transação neste período.</li>';
            return;
        }

        data.slice(0, 5).forEach(t => {
            const li = document.createElement("li");
            li.className = "flex items-center gap-3 py-2.5 border-b";
            li.style.borderColor = "var(--app-soft)";
            const isIncome = t.type === 'INCOME';
            const symbol = isIncome ? '+' : '−';
            const formattedDate = formatDate(t.date);
            const formattedValue = formatCurrency(t.amount);
            const icon = isIncome ? '↑' : (t.category && t.category.icon ? t.category.icon : '↓');
            const iconBg = isIncome ? 'var(--app-success-bg)' : 'var(--app-soft)';
            const iconColor = isIncome ? 'var(--app-success)' : 'var(--app-primary-dark)';
            const safeTransaction = JSON.stringify(t).replace(/'/g, "&#39;");
            li.innerHTML = `
                <div class="w-[34px] h-[34px] rounded-lg flex items-center justify-center font-bold text-[13px] flex-shrink-0"
                     style="background:${iconBg};color:${iconColor}">${icon}</div>
                <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate" style="color:var(--app-heading)" title="${t.description}">${t.description}</div>
                    <div class="text-[11px]" style="color:#9daebf">${formattedDate} · ${t.category ? t.category.name : 'Sem categoria'}</div>
                </div>
                <span class="font-bold whitespace-nowrap" style="color:${isIncome ? 'var(--app-success)' : 'var(--app-danger)'}">
                    ${symbol} R$ ${formattedValue}
                </span>
                <button onclick='openEditModal(${safeTransaction})'
                    class="p-1.5 rounded-md transition hover:bg-[#edf3f8]" style="color:#9daebf" title="Editar">✎</button>
            `;
            listContainer.appendChild(li);
        });
    } catch (e) {
        console.error("Erro ao carregar transações:", e);
    }
}

async function loadCategoryBars() {
    const container = document.getElementById("category-bars");
    if (!container) return;

    try {
        const response = await apiFetch(`/api/dashboard/expenses-by-category?year=${currentYear}&month=${currentMonth}`);
        const data = await response.json();

        container.innerHTML = "";
        if (data.length === 0) {
            container.innerHTML = '<div class="py-6 text-center text-sm italic" style="color:#9daebf">Sem despesas neste período.</div>';
            return;
        }

        const palette = ["#27659e", "#3b82c4", "#5d9cd4", "#82b5e0", "#aecdea", "#c9dcf0", "#dde9f6"];
        const sorted = [...data].sort((a, b) => b.total - a.total);
        const max = sorted[0].total || 1;

        sorted.forEach((item, i) => {
            const pct = Math.max(4, Math.round((item.total / max) * 100));
            const row = document.createElement("div");
            row.innerHTML = `
                <div class="flex justify-between mb-1">
                    <span>${item.category}</span>
                    <span class="font-semibold">R$ ${formatCurrency(item.total)}</span>
                </div>
                <div class="h-[7px] rounded" style="background:var(--app-soft)">
                    <div class="h-[7px] rounded transition-all" style="width:${pct}%;background:${palette[i % palette.length]}"></div>
                </div>
            `;
            container.appendChild(row);
        });
    } catch (e) {
        console.error("Erro nas categorias:", e);
    }
}

async function loadCharts() {
    const months = lastMonths(6);

    try {
        const results = await Promise.all(
            months.map(m => fetchSummary(m.year, m.month).catch(() => null))
        );

        renderEvolutionChart(months, results);
        renderBarsChart(months, results);
    } catch (e) {
        console.error("Erro nos gráficos:", e);
    }
}

function renderEvolutionChart(months, results) {
    const container = document.getElementById("evolution-chart");
    const labels = document.getElementById("evolution-labels");
    if (!container) return;

    const balances = results.map(r => (r && r.balance) || 0);
    const min = Math.min(...balances, 0);
    const max = Math.max(...balances, 1);
    const range = max - min || 1;

    const W = 500, H = 150, PAD = 10;
    const points = balances.map((b, i) => {
        const x = (i / (balances.length - 1)) * W;
        const y = PAD + (1 - (b - min) / range) * (H - PAD * 2);
        return [Math.round(x), Math.round(y)];
    });

    const line = points.map(p => p.join(",")).join(" ");
    const last = points[points.length - 1];

    container.innerHTML = `
        <svg width="100%" height="150" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="gd1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#3b82c4" stop-opacity=".25"></stop>
                    <stop offset="1" stop-color="#3b82c4" stop-opacity="0"></stop>
                </linearGradient>
            </defs>
            <path d="M${line.replace(/ /g, " L")} L${W},${H} L0,${H} Z" fill="url(#gd1)"></path>
            <polyline points="${line}" fill="none" stroke="#3b82c4" stroke-width="2.5"></polyline>
            <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#3b82c4"></circle>
        </svg>
    `;

    if (labels) {
        labels.innerHTML = months.map(m => `<span>${MONTHS_SHORT[m.month - 1]}</span>`).join("");
    }
}

function renderBarsChart(months, results) {
    const container = document.getElementById("bars-chart");
    const labels = document.getElementById("bars-labels");
    if (!container) return;

    const maxVal = Math.max(
        ...results.map(r => Math.max((r && r.totalIncome) || 0, (r && r.totalExpenses) || 0)),
        1
    );

    container.innerHTML = results.map(r => {
        const incomePct = Math.round((((r && r.totalIncome) || 0) / maxVal) * 100);
        const expensePct = Math.round((((r && r.totalExpenses) || 0) / maxVal) * 100);
        return `
            <div class="flex-1 flex gap-1 items-end h-full">
                <div class="flex-1 rounded-t" style="height:${Math.max(incomePct, 2)}%;background:var(--app-primary)"></div>
                <div class="flex-1 rounded-t" style="height:${Math.max(expensePct, 2)}%;background:#c3d3e8"></div>
            </div>
        `;
    }).join("");

    if (labels) {
        labels.innerHTML = months.map(m => `<span>${MONTHS_SHORT[m.month - 1]}</span>`).join("");
    }
}

function openModal(transaction = null) {
    const modal = document.getElementById("modal");
    modal.classList.remove("hidden");

    const toggleRow = document.getElementById("installmentToggleRow");
    const installmentCheckbox = document.getElementById("isInstallment");
    installmentCheckbox.checked = false;
    document.getElementById("installmentFields").classList.add("hidden");
    document.getElementById("installmentCount").value = 2;

    if (transaction) {
        editingTransactionId = transaction.id;
        document.getElementById("modal-title").innerText = "Editar Transação";
        document.getElementById("description").value = transaction.description;
        document.getElementById("amount").value = formatCurrency(transaction.amount);
        document.getElementById("date").value = transaction.date;
        document.getElementById("type").value = transaction.type;
        if (toggleRow) toggleRow.classList.add("hidden");

        filterCategoriesByType();
        if (transaction.category) {
            document.getElementById("categoryId").value = transaction.category.id;
        }
    } else {
        editingTransactionId = null;
        document.getElementById("modal-title").innerText = "Nova Transação";
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").valueAsDate = new Date();
        document.getElementById("type").value = "EXPENSE";
        if (toggleRow) toggleRow.classList.remove("hidden");
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
            headers: { "Content-Type": "application/json" },
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
    try {
        const response = await apiFetch(`/api/categories`);
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
    const description = document.getElementById("description").value;
    const amount = parseCurrencyInput(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const categoryId = document.getElementById("categoryId").value;

    const installmentCheckbox = document.getElementById("isInstallment");
    const isInstallment = !editingTransactionId && installmentCheckbox && installmentCheckbox.checked;
    const installmentCount = isInstallment ? parseInt(document.getElementById("installmentCount").value, 10) : 1;

    if (!description || !amount || !date || !categoryId) {
        showToast("Preencha todos os campos!", "error");
        return;
    }

    if (isInstallment && (!installmentCount || installmentCount < 2)) {
        showToast("Informe pelo menos 2 parcelas.", "error");
        return;
    }

    const saveBtn = document.getElementById("saveTransactionBtn");
    const originalText = saveBtn.innerText;

    try {
        if (editingTransactionId) {
            const body = { description, amount, date, type, categoryId };
            const response = await apiFetch(`/api/transactions/${editingTransactionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                showToast("Transação atualizada!", "success");
                closeModal();
                refreshDashboard();
            } else {
                const err = await response.json();
                showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
            }
            return;
        }

        if (isInstallment) {
            saveBtn.disabled = true;
            let sucesso = 0;
            for (let i = 0; i < installmentCount; i++) {
                saveBtn.innerText = `Criando parcela ${i + 1}/${installmentCount}...`;
                const parcelaData = addMonthsClamped(date, i);
                const parcelaDescricao = `${description} (${i + 1}/${installmentCount})`;
                const response = await apiFetch(`/api/transactions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: parcelaDescricao, amount, date: parcelaData, type, categoryId })
                });
                if (response.ok) sucesso++;
            }

            if (sucesso === installmentCount) {
                showToast(`${installmentCount} parcelas criadas!`, "success");
            } else {
                showToast(`Criadas ${sucesso} de ${installmentCount} parcelas — confira a lista de transações.`, "error");
            }
            closeModal();
            refreshDashboard();
            return;
        }

        const response = await apiFetch(`/api/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, amount, date, type, categoryId })
        });

        if (response.ok) {
            showToast("Transação criada!", "success");
            closeModal();
            refreshDashboard();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = originalText;
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
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
