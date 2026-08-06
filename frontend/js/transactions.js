let allCategories = [];
let allCards = [];
let editingTransactionId = null;
let editingCardId = null;
let activeInvoiceCard = null;

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
    loadCards();
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
            <td class="px-[18px] py-[13px]">
                <span class="category-pill text-[11px] font-semibold px-[9px] py-[3px] rounded-xl">${t.category ? t.category.name : '-'}</span>
                ${t.card ? `<span class="category-pill text-[11px] font-semibold px-[9px] py-[3px] rounded-xl ml-1">${t.card.icon || '💳'} ${t.card.name}</span>` : ''}
            </td>
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

async function loadCards() {
    try {
        const response = await apiFetch(`/api/cards`);
        if (response.ok) {
            allCards = await response.json();
            populateCardSelect();
            renderCardsPanel();
        }
    } catch (error) {
        console.error("Erro ao carregar cartões:", error);
    }
}

function populateCardSelect() {
    const select = document.getElementById("cardId");
    if (!select) return;

    const selected = select.value;
    select.innerHTML = '<option value="">Nenhum</option>';
    allCards.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.text = `${c.icon || '💳'} ${c.name}`;
        select.appendChild(option);
    });
    select.value = selected;
}

function renderCardsPanel() {
    const panel = document.getElementById("cards-panel");
    if (!panel) return;

    if (allCards.length === 0) {
        panel.innerHTML = '<span class="text-xs" style="color:var(--app-muted)">Nenhum cartão cadastrado ainda.</span>';
        return;
    }

    panel.innerHTML = "";
    allCards.forEach(c => {
        const chip = document.createElement("div");
        chip.className = "flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg cursor-pointer transition hover:bg-[#e0e7ef]";
        chip.style.background = "var(--app-soft)";
        chip.title = "Clique para editar";
        chip.onclick = () => openCardModal(c);

        const hasPending = c.pendingTotal && parseFloat(c.pendingTotal) > 0;
        const pendingColor = hasPending ? 'var(--app-danger)' : 'var(--app-muted)';

        chip.innerHTML = `
            <span class="text-base">${c.icon || '💳'}</span>
            <div class="leading-tight">
                <div class="text-[12px] font-semibold" style="color:var(--app-heading)">${c.name}</div>
                <div class="text-[11px]" style="color:var(--app-muted)">Total: R$ ${formatCurrency(c.totalSpent)}${c.closingDay ? ` · fecha dia ${c.closingDay}` : ''}${c.dueDay ? ` · vence dia ${c.dueDay}` : ''}</div>
                <div class="text-[11px] font-semibold" style="color:${pendingColor}">Pendente: R$ ${formatCurrency(c.pendingTotal)}</div>
            </div>
            ${hasPending ? `<button title="Pagar fatura" class="pay-invoice-btn ml-1 px-2 py-1 rounded-md text-[11px] font-semibold transition" style="background:var(--app-primary);color:#fff">Pagar</button>` : ''}
            <button title="Excluir cartão" class="delete-card-btn ml-1 text-[11px] transition hover:!text-red-600" style="color:#c3ccd6">✕</button>
        `;

        const payBtn = chip.querySelector(".pay-invoice-btn");
        if (payBtn) {
            payBtn.onclick = (event) => {
                event.stopPropagation();
                openPayInvoiceModal(c);
            };
        }
        chip.querySelector(".delete-card-btn").onclick = (event) => {
            event.stopPropagation();
            deleteCard(c.id);
        };
        panel.appendChild(chip);
    });
}

function openCardModal(card = null) {
    document.getElementById("cardModal").classList.remove("hidden");

    if (card) {
        editingCardId = card.id;
        document.getElementById("cardModalTitle").innerText = "Editar Cartão";
        document.getElementById("cardName").value = card.name;
        document.getElementById("cardIcon").value = card.icon || "";
        document.getElementById("cardClosingDay").value = card.closingDay || "";
        document.getElementById("cardDueDay").value = card.dueDay || "";
    } else {
        editingCardId = null;
        document.getElementById("cardModalTitle").innerText = "Novo Cartão";
        document.getElementById("cardName").value = "";
        document.getElementById("cardIcon").value = "";
        document.getElementById("cardClosingDay").value = "";
        document.getElementById("cardDueDay").value = "";
    }
}

function closeCardModal() {
    document.getElementById("cardModal").classList.add("hidden");
}

async function saveCard() {
    const name = document.getElementById("cardName").value;
    const icon = document.getElementById("cardIcon").value || "💳";
    const closingDayValue = document.getElementById("cardClosingDay").value;
    const closingDay = closingDayValue ? parseInt(closingDayValue, 10) : null;
    const dueDayValue = document.getElementById("cardDueDay").value;
    const dueDay = dueDayValue ? parseInt(dueDayValue, 10) : null;

    if (!name) {
        showToast("Digite um nome para o cartão!", "error");
        return;
    }

    try {
        const response = editingCardId
            ? await apiFetch(`/api/cards/${editingCardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, icon, closingDay, dueDay })
            })
            : await apiFetch(`/api/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, icon, closingDay, dueDay })
            });

        if (response.ok) {
            showToast(editingCardId ? "Cartão atualizado com sucesso!" : "Cartão criado com sucesso!", "success");
            closeCardModal();
            await loadCards();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar cartão."), "error");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

async function deleteCard(id) {
    if (!confirm("Tem certeza que deseja excluir este cartão? As transações vinculadas continuarão existindo, apenas sem cartão associado.")) return;

    try {
        const response = await apiFetch(`/api/cards/${id}`, { method: "DELETE" });
        if (response.ok) {
            showToast("Cartão excluído!", "success");
            await loadCards();
            loadTransactions(currentYear, currentMonth);
        } else {
            showToast("Erro ao excluir cartão.", "error");
        }
    } catch (error) {
        console.error(error);
    }
}

async function openPayInvoiceModal(card) {
    activeInvoiceCard = card;
    document.getElementById("payInvoiceModalTitle").innerText = `Faturas pendentes — ${card.name}`;
    document.getElementById("payInvoiceModal").classList.remove("hidden");
    await loadPendingInvoicesList();
}

function closePayInvoiceModal() {
    document.getElementById("payInvoiceModal").classList.add("hidden");
    activeInvoiceCard = null;
}

async function loadPendingInvoicesList() {
    const container = document.getElementById("pending-invoices-list");
    if (!activeInvoiceCard) return;

    container.innerHTML = '<p class="text-sm text-center" style="color:var(--app-muted)">Carregando...</p>';

    try {
        const response = await apiFetch(`/api/cards/${activeInvoiceCard.id}/invoices`);
        if (!response.ok) throw new Error("Falha ao buscar faturas");

        const invoices = await response.json();

        if (invoices.length === 0) {
            container.innerHTML = '<p class="text-sm text-center" style="color:var(--app-muted)">Nenhuma fatura pendente 🎉</p>';
            return;
        }

        container.innerHTML = "";
        invoices.forEach(inv => {
            const row = document.createElement("div");
            row.className = "flex items-center justify-between px-3 py-2.5 rounded-lg";
            row.style.background = "var(--app-soft)";
            row.innerHTML = `
                <div>
                    <div class="text-[13px] font-semibold" style="color:var(--app-heading)">${MONTHS_LONG[inv.month - 1]} de ${inv.year}</div>
                    <div class="text-[12px]" style="color:var(--app-muted)">R$ ${formatCurrency(inv.total)}</div>
                </div>
                <button class="app-button px-3 py-1.5 rounded-lg text-[12px] font-semibold transition">Marcar como paga</button>
            `;
            row.querySelector("button").onclick = () => payInvoice(inv.year, inv.month);
            container.appendChild(row);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-sm text-center text-red-600">Erro ao carregar faturas.</p>';
    }
}

async function payInvoice(year, month) {
    const paidDate = new Date().toISOString().split("T")[0];

    try {
        const response = await apiFetch(`/api/cards/${activeInvoiceCard.id}/invoices/pay`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, month, paidDate })
        });

        if (response.ok) {
            showToast("Fatura marcada como paga!", "success");
            await loadCards();
            await loadPendingInvoicesList();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao registrar pagamento."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
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

        setTimeout(() => {
            if (transaction.category) {
                document.getElementById("categoryId").value = transaction.category.id;
            }
            document.getElementById("cardId").value = transaction.card ? transaction.card.id : "";
            updateInvoicePreview();
        }, 50);

    } else {
        editingTransactionId = null;
        document.getElementById("modal-title").innerText = "Nova Transação";
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("date").valueAsDate = new Date();
        document.getElementById("type").value = "EXPENSE";
        document.getElementById("cardId").value = "";
        if (toggleRow) toggleRow.classList.remove("hidden");
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

    const cardFieldRow = document.getElementById("cardFieldRow");
    if (cardFieldRow) cardFieldRow.classList.toggle("hidden", selectedType !== "EXPENSE");
    updateInvoicePreview();
}

function updateInvoicePreview() {
    const hint = document.getElementById("cardInvoiceHint");
    if (!hint) return;

    const cardId = document.getElementById("cardId").value;
    const dateStr = document.getElementById("date").value;

    if (!cardId || !dateStr) {
        hint.innerHTML = "&nbsp;";
        return;
    }

    const card = allCards.find(c => String(c.id) === String(cardId));
    if (!card || !card.closingDay) {
        hint.innerHTML = "&nbsp;";
        return;
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    let targetYear = y, targetMonth = m;
    if (d >= card.closingDay) {
        targetMonth += 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
    }

    hint.textContent = `📅 Cai na fatura de ${MONTHS_LONG[targetMonth - 1]} de ${targetYear}`;
}

async function createTransaction() {
    const description = document.getElementById("description").value;
    const amount = parseCurrencyInput(document.getElementById("amount").value);
    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const categoryId = document.getElementById("categoryId").value;
    const cardIdValue = document.getElementById("cardId").value;
    const cardId = cardIdValue ? parseInt(cardIdValue, 10) : null;

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
            const body = { description, amount, date, type, categoryId, cardId };
            const response = await apiFetch(`/api/transactions/${editingTransactionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                showToast("Transação atualizada!", "success");
                closeModal();
                loadTransactions(currentYear, currentMonth);
                loadCards();
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
                    body: JSON.stringify({ description: parcelaDescricao, amount, date: parcelaData, type, categoryId, cardId })
                });
                if (response.ok) sucesso++;
            }

            if (sucesso === installmentCount) {
                showToast(`${installmentCount} parcelas criadas!`, "success");
            } else {
                showToast(`Criadas ${sucesso} de ${installmentCount} parcelas — confira a lista de transações.`, "error");
            }
            closeModal();
            loadTransactions(currentYear, currentMonth);
            loadCards();
            return;
        }

        const response = await apiFetch(`/api/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, amount, date, type, categoryId, cardId })
        });

        if (response.ok) {
            showToast("Transação criada!", "success");
            closeModal();
            loadTransactions(currentYear, currentMonth);
            loadCards();
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
