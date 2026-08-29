let allLoans = [];
let currentFilter = "ALL";
let activeRepaymentLoanId = null;

const TOUR_STEPS = [
    {
        selector: ".grid.grid-cols-1.md\\:grid-cols-3",
        title: "Resumo dos empréstimos",
        text: "Veja quanto você já emprestou no total, quanto já recebeu de volta e quanto ainda está pendente."
    },
    {
        selector: "#loans-filter-bar",
        title: "Filtrar por status",
        text: "Filtre a lista pra ver só os empréstimos pendentes, parcialmente recebidos ou já quitados."
    },
    {
        selector: "button[onclick='openLoanModal()']",
        title: "Novo Empréstimo",
        text: "Registre um dinheiro que você emprestou pra alguém, com a data e uma previsão de devolução opcional."
    },
    {
        selector: "#loans-body",
        title: "Seus empréstimos",
        text: "Registre um recebimento (mesmo que parcial) ou exclua um empréstimo por aqui."
    }
];

document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    setupSettingsEvents();
    document.querySelector('.filter-pill[data-filter="ALL"]').classList.add("filter-active");
    loadLoans();
    setupMoneyInput_loanAmount();
    setupMoneyInput_repaymentAmount();
    initPageTour(TOUR_STEPS, "loans");

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

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    const isPasswordFormValid = validateFields([
        { id: "current-password", valid: !!currentPassword, message: "Digite sua senha atual." },
        { id: "new-password", valid: passwordRegex.test(newPassword), message: "Mín. 8 caracteres, com letra, número e caractere especial (@$!%*#?&)." },
        { id: "confirm-password", valid: !!confirmPassword && newPassword === confirmPassword, message: "As senhas não coincidem." }
    ]);
    if (!isPasswordFormValid) return;

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

// ---------- Máscara de valor monetário (reaproveita a lógica de setupMoneyInput, só aponta pra outro input) ----------
function setupMoneyInput_loanAmount() {
    maskCurrencyInput(document.getElementById("loanAmount"));
}
function setupMoneyInput_repaymentAmount() {
    maskCurrencyInput(document.getElementById("repaymentAmount"));
}
function maskCurrencyInput(input) {
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

// ---------- Empréstimos ----------

// Usado pelo botão de ocultar valores (api.js) pra repintar a tela atual sem reload.
function refreshCurrentView() {
    loadLoans();
}

async function loadLoans() {
    const tbody = document.getElementById("loans-body");
    try {
        const [loansResponse, summaryResponse] = await Promise.all([
            apiFetch("/api/loans"),
            apiFetch("/api/loans/summary")
        ]);

        if (!loansResponse.ok) throw new Error("Falha ao buscar empréstimos");

        allLoans = await loansResponse.json();
        renderLoans();

        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            document.getElementById("summary-total-lent").innerText = `R$ ${formatCurrency(summary.totalLent)}`;
            document.getElementById("summary-total-returned").innerText = `R$ ${formatCurrency(summary.totalReturned)}`;
            document.getElementById("summary-total-pending").innerText = `R$ ${formatCurrency(summary.totalPending)}`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-red-600">Erro ao carregar empréstimos.</td></tr>';
    }
}

function setStatusFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll(".filter-pill").forEach(btn => {
        btn.classList.toggle("filter-active", btn.dataset.filter === filter);
    });
    renderLoans();
}

const STATUS_LABELS = { PENDING: "Pendente", PARTIAL: "Parcial", PAID: "Pago" };
const STATUS_CLASSES = { PENDING: "pill-expense", PARTIAL: "pill-partial", PAID: "pill-income" };

function renderLoans() {
    const tbody = document.getElementById("loans-body");
    tbody.innerHTML = "";

    const filtered = currentFilter === "ALL"
        ? allLoans
        : allLoans.filter(l => l.status === currentFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center" style="color:#9daebf">Nenhum empréstimo encontrado.</td></tr>';
        return;
    }

    filtered.forEach(loan => {
        const tr = document.createElement("tr");
        tr.className = "table-row transition";

        const statusLabel = STATUS_LABELS[loan.status] || loan.status;
        const statusClass = STATUS_CLASSES[loan.status] || "category-pill";
        const isPaid = loan.status === "PAID";

        tr.innerHTML = `
            <td class="px-[18px] py-[13px] font-semibold" style="color:var(--app-heading)">${escapeHtml(loan.personName)}</td>
            <td class="px-[18px] py-[13px]" style="color:var(--app-muted)">${escapeHtml(loan.description) || '-'}</td>
            <td class="px-[18px] py-[13px] whitespace-nowrap" style="color:var(--app-muted)">${formatDate(loan.dateLent)}</td>
            <td class="px-[18px] py-[13px] text-right font-bold whitespace-nowrap" style="color:var(--app-heading)">R$ ${formatCurrency(loan.amount)}</td>
            <td class="px-[18px] py-[13px] text-right font-bold whitespace-nowrap" style="color:${isPaid ? 'var(--app-success)' : 'var(--app-danger)'}">R$ ${formatCurrency(loan.remaining)}</td>
            <td class="px-[18px] py-[13px]"><span class="${statusClass} text-[11px] font-bold px-[9px] py-[3px] rounded-xl">${statusLabel}</span></td>
            <td class="px-[18px] py-[13px] text-center whitespace-nowrap">
                ${isPaid ? "" : `<button onclick="openRepaymentModal(${loan.id}, '${escapeHtml(loan.personName)}', ${loan.remaining})"
                    class="icon-btn px-1.5 py-1 transition hover:!text-[#3b82c4]" title="Registrar recebimento" aria-label="Registrar recebimento" style="color:#9daebf">${ICON_COIN}</button>`}
                <button onclick="deleteLoan(${loan.id})" title="Excluir" aria-label="Excluir empréstimo"
                    class="icon-btn px-1.5 py-1 transition hover:!text-red-600" style="color:#9daebf">${ICON_TRASH}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openLoanModal() {
    document.getElementById("loanModal").classList.remove("hidden");
    clearFieldErrors(["loanPersonName", "loanAmount", "loanDateLent"]);
    document.getElementById("loanPersonName").value = "";
    document.getElementById("loanAmount").value = "";
    document.getElementById("loanDescription").value = "";
    document.getElementById("loanDateLent").valueAsDate = new Date();
    document.getElementById("loanExpectedReturn").value = "";
}

function closeLoanModal() {
    document.getElementById("loanModal").classList.add("hidden");
}

async function createLoan() {
    const personName = document.getElementById("loanPersonName").value;
    const amount = parseCurrencyInput(document.getElementById("loanAmount").value);
    const dateLent = document.getElementById("loanDateLent").value;
    const expectedReturnDate = document.getElementById("loanExpectedReturn").value || null;
    const description = document.getElementById("loanDescription").value || null;

    const isValid = validateFields([
        { id: "loanPersonName", valid: !!personName, message: "Digite o nome da pessoa." },
        { id: "loanAmount", valid: amount > 0, message: "Informe um valor válido." },
        { id: "loanDateLent", valid: !!dateLent, message: "Selecione a data do empréstimo." }
    ]);
    if (!isValid) return;

    try {
        const response = await apiFetch("/api/loans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personName, description, amount, dateLent, expectedReturnDate })
        });

        if (response.ok) {
            showToast("Empréstimo registrado!", "success");
            closeLoanModal();
            loadLoans();
        } else {
            const err = await response.json();
            showToast("Erro: " + (err.message || "Falha ao salvar."), "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}

function openRepaymentModal(loanId, personName, remaining) {
    activeRepaymentLoanId = loanId;
    clearFieldErrors(["repaymentAmount", "repaymentDate"]);
    document.getElementById("repaymentContext").innerText =
        `${personName} ainda deve R$ ${formatCurrency(remaining)}.`;
    document.getElementById("repaymentAmount").value = "";
    document.getElementById("repaymentDate").valueAsDate = new Date();
    document.getElementById("repaymentModal").classList.remove("hidden");
}

function closeRepaymentModal() {
    document.getElementById("repaymentModal").classList.add("hidden");
    activeRepaymentLoanId = null;
}

async function submitRepayment() {
    const amount = parseCurrencyInput(document.getElementById("repaymentAmount").value);
    const date = document.getElementById("repaymentDate").value;

    const isValid = validateFields([
        { id: "repaymentAmount", valid: amount > 0, message: "Informe um valor válido." },
        { id: "repaymentDate", valid: !!date, message: "Selecione a data." }
    ]);
    if (!isValid) return;

    const btn = document.getElementById("saveRepaymentBtn");
    const originalText = btn.innerText;

    try {
        btn.disabled = true;
        const response = await apiFetch(`/api/loans/${activeRepaymentLoanId}/repayments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount, date })
        });

        if (response.ok) {
            showToast("Recebimento registrado!", "success");
            closeRepaymentModal();
            loadLoans();
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

async function deleteLoan(id) {
    if (!confirm("Tem certeza que deseja excluir este empréstimo? Isso também remove o histórico de recebimentos dele.")) return;

    try {
        const response = await apiFetch(`/api/loans/${id}`, { method: "DELETE" });

        if (response.ok) {
            showToast("Empréstimo excluído!", "success");
            loadLoans();
        } else {
            showToast("Erro ao excluir.", "error");
        }
    } catch (error) {
        console.error(error);
        showToast("Erro de conexão.", "error");
    }
}
