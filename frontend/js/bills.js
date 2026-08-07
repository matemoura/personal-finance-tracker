let allBills = [];
let allCategories = [];
let allCards = [];
let currentFilter = "ALL";
let activePayBillId = null;

document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    setupSettingsEvents();
    document.querySelector('.filter-pill[data-filter="ALL"]').classList.add("filter-active");
    loadCategories();
    loadCards();
    loadBills();
    setupMoneyInput_billAmount();

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

function logout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

// ---------- Máscara de valor monetário ----------
function setupMoneyInput_billAmount() {
    const input = document.getElementById("billAmount");
    if (!input) return;
    input.addEventListener("input", function (e) {
        let value = e.target.value.replace(/\D/g, "");
        let numericValue = parseInt(value || "0") / 100;
        e.target.value = new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numericValue);
    });
}

// ---------- Categorias e Cartões (para os selects do modal) ----------

async function loadCategories() {
    try {
        const response = await apiFetch(`/api/categories`);
        if (response.ok) {
            allCategories = await response.json();
            populateBillCategorySelect();
        }
    } catch (error) {
        console.error("Erro ao carregar categorias:", error);
    }
}

function populateBillCategorySelect() {
    const select = document.getElementById("billCategoryId");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    allCategories.filter(c => c.type === "EXPENSE").forEach(c => {
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
            populateBillCardSelect();
        }
    } catch (error) {
        console.error("Erro ao carregar cartões:", error);
    }
}

function populateBillCardSelect() {
    const select = document.getElementById("billCardId");
    if (!select) return;

    select.innerHTML = '<option value="">Nenhum</option>';
    allCards.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.text = `${bankEmojiFor(c.icon)} ${c.name}`;
        select.appendChild(option);
    });
}

// ---------- Contas a Pagar ----------

// Usado pelo botão de ocultar valores (api.js) pra repintar a tela atual sem reload.
function refreshCurrentView() {
    loadBills();
}

async function loadBills() {
    const tbody = document.getElementById("bills-body");
    try {
        const response = await apiFetch("/api/bills");
        if (!response.ok) throw new Error("Falha ao buscar contas");

        allBills = await response.json();
        renderSummary();
        renderBills();
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-600">Erro ao carregar contas.</td></tr>';
    }
}

function renderSummary() {
    const totals = { PENDING: 0, OVERDUE: 0, PAID: 0 };
    const counts = { PENDING: 0, OVERDUE: 0, PAID: 0 };

    allBills.forEach(b => {
        totals[b.status] = (totals[b.status] || 0) + b.amount;
        counts[b.status] = (counts[b.status] || 0) + 1;
    });

    document.getElementById("summary-total-pending").innerText = `R$ ${formatCurrency(totals.PENDING)}`;
    document.getElementById("summary-total-overdue").innerText = `R$ ${formatCurrency(totals.OVERDUE)}`;
    document.getElementById("summary-total-paid").innerText = `R$ ${formatCurrency(totals.PAID)}`;

    document.getElementById("summary-count-pending").textContent = counts.PENDING > 0 ? `${counts.PENDING} conta${counts.PENDING > 1 ? "s" : ""}` : "Nenhuma";
    document.getElementById("summary-count-overdue").textContent = counts.OVERDUE > 0 ? `${counts.OVERDUE} conta${counts.OVERDUE > 1 ? "s" : ""}` : "Nenhuma";
    document.getElementById("summary-count-paid").textContent = counts.PAID > 0 ? `${counts.PAID} conta${counts.PAID > 1 ? "s" : ""}` : "Nenhuma";
}

function setStatusFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll(".filter-pill").forEach(btn => {
        btn.classList.toggle("filter-active", btn.dataset.filter === filter);
    });
    renderBills();
}

const STATUS_LABELS = { PENDING: "Pendente", OVERDUE: "Atrasada", PAID: "Paga" };
const STATUS_CLASSES = { PENDING: "pill-partial", OVERDUE: "pill-expense", PAID: "pill-income" };

function renderBills() {
    const tbody = document.getElementById("bills-body");
    tbody.innerHTML = "";

    const filtered = currentFilter === "ALL"
        ? allBills
        : allBills.filter(b => b.status === currentFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center" style="color:#9daebf">Nenhuma conta encontrada.</td></tr>';
        return;
    }

    filtered.forEach(bill => {
        const tr = document.createElement("tr");
        tr.className = "table-row transition";

        const statusLabel = STATUS_LABELS[bill.status] || bill.status;
        const statusClass = STATUS_CLASSES[bill.status] || "category-pill";
        const isPaid = bill.status === "PAID";
        const cardBadge = bill.cardId ? `<span class="category-pill text-[11px] font-semibold px-[9px] py-[3px] rounded-xl ml-1 inline-flex items-center gap-1">${renderCardIcon(bill.cardIcon, bill.cardName, "w-3.5 h-3.5")} ${escapeHtml(bill.cardName)}</span>` : '';

        tr.innerHTML = `
            <td class="px-[18px] py-[13px] font-semibold" style="color:var(--app-heading)">${escapeHtml(bill.description)}</td>
            <td class="px-[18px] py-[13px]">
                <span class="category-pill text-[11px] font-semibold px-[9px] py-[3px] rounded-xl">${escapeHtml(bill.categoryIcon) || '📃'} ${escapeHtml(bill.categoryName)}</span>
                ${cardBadge}
            </td>
            <td class="px-[18px] py-[13px] whitespace-nowrap" style="color:var(--app-muted)">${formatDate(bill.dueDate)}</td>
            <td class="px-[18px] py-[13px] text-right font-bold whitespace-nowrap" style="color:var(--app-heading)">R$ ${formatCurrency(bill.amount)}</td>
            <td class="px-[18px] py-[13px]"><span class="${statusClass} text-[11px] font-bold px-[9px] py-[3px] rounded-xl">${statusLabel}</span></td>
            <td class="px-[18px] py-[13px] text-center whitespace-nowrap">
                ${isPaid ? "" : `<button onclick="openPayBillModal(${bill.id}, '${escapeHtml(bill.description)}', ${bill.amount})"
                    class="px-1.5 py-1 text-[13px] transition hover:!text-[#3b82c4]" title="Marcar como pago" style="color:#9daebf">✔️</button>`}
                ${isPaid ? "" : `<button onclick="deleteBill(${bill.id})" title="Excluir"
                    class="px-1.5 py-1 text-[13px] transition hover:!text-red-600" style="color:#9daebf">🗑</button>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openBillModal() {
    document.getElementById("billModal").classList.remove("hidden");
    document.getElementById("billDescription").value = "";
    document.getElementById("billAmount").value = "";
    document.getElementById("billDueDate").valueAsDate = new Date();
    document.getElementById("billCategoryId").value = "";
    document.getElementById("billCardId").value = "";
}

function closeBillModal() {
    document.getElementById("billModal").classList.add("hidden");
}

async function createBill() {
    const description = document.getElementById("billDescription").value;
    const amount = parseCurrencyInput(document.getElementById("billAmount").value);
    const dueDate = document.getElementById("billDueDate").value;
    const categoryId = document.getElementById("billCategoryId").value;
    const cardIdValue = document.getElementById("billCardId").value;
    const cardId = cardIdValue ? parseInt(cardIdValue, 10) : null;

    if (!description || !amount || !dueDate || !categoryId) {
        showToast("Preencha descrição, valor, vencimento e categoria!", "error");
        return;
    }

    try {
        const response = await apiFetch("/api/bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, amount, dueDate, categoryId, cardId })
        });

        if (response.ok) {
            showToast("Conta registrada!", "success");
            closeBillModal();
            loadBills();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}

function openPayBillModal(billId, description, amount) {
    activePayBillId = billId;
    document.getElementById("payBillContext").innerText =
        `${description} — R$ ${formatCurrency(amount)}`;
    document.getElementById("payBillDate").valueAsDate = new Date();
    document.getElementById("payBillModal").classList.remove("hidden");
}

function closePayBillModal() {
    document.getElementById("payBillModal").classList.add("hidden");
    activePayBillId = null;
}

async function submitPayBill() {
    const paidDate = document.getElementById("payBillDate").value;

    if (!paidDate) {
        showToast("Informe a data do pagamento!", "error");
        return;
    }

    const btn = document.getElementById("confirmPayBillBtn");
    const originalText = btn.innerText;

    try {
        btn.disabled = true;
        const response = await apiFetch(`/api/bills/${activePayBillId}/pay`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paidDate })
        });

        if (response.ok) {
            showToast("Conta marcada como paga!", "success");
            closePayBillModal();
            loadBills();
            checkDueReminders();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao registrar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function deleteBill(id) {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
        const response = await apiFetch(`/api/bills/${id}`, { method: "DELETE" });

        if (response.ok) {
            showToast("Conta excluída!", "success");
            loadBills();
        } else {
            showToast("Erro ao excluir.", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}
