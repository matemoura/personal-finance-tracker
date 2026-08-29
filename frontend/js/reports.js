const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth() + 1;

const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

document.addEventListener("DOMContentLoaded", () => {
    const monthSelect = document.getElementById("report-month");
    if (monthSelect) monthSelect.value = currentMonth;

    loadUserData();
    setupSettingsEvents();
    loadAvailableYears().then(() => previewReport());

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

async function loadAvailableYears() {
    const yearSelect = document.getElementById("report-year");
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

// Usado pelo botão de ocultar valores (api.js) pra repintar a tela atual sem reload.
function refreshCurrentView() {
    previewReport();
}

async function previewReport() {
    const year = document.getElementById("report-year").value;
    const month = document.getElementById("report-month").value;

    const token = getToken();
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("preview-date").innerText = `${MONTHS_LONG[month - 1]} de ${year}`;
    const tbody = document.getElementById("report-preview-body");
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center" style="color:#9daebf">Carregando...</td></tr>';

    try {
        const [txResponse, summaryResponse] = await Promise.all([
            apiFetch(`/api/transactions?year=${year}&month=${month}`),
            apiFetch(`/api/dashboard/summary?year=${year}&month=${month}`)
        ]);

        if (!txResponse.ok) throw new Error("Falha ao buscar dados");

        if (summaryResponse.ok) {
            const summary = await summaryResponse.json();
            const income = summary.totalIncome || 0;
            const expense = summary.totalExpenses || 0;
            document.getElementById("report-income").innerText = `R$ ${formatCurrency(income)}`;
            document.getElementById("report-expense").innerText = `R$ ${formatCurrency(expense)}`;
            document.getElementById("report-result").innerText = `R$ ${formatCurrency(income - expense)}`;
        }

        const data = await txResponse.json();

        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center" style="color:#9daebf">Nenhuma transação encontrada neste período.</td></tr>';
            return;
        }

        data.forEach(t => {
            const tr = document.createElement("tr");
            tr.className = "table-row";

            const isIncome = t.type === 'INCOME';
            const typeLabel = isIncome ? 'Receita' : 'Despesa';
            const symbol = isIncome ? '+' : '−';

            const formattedDate = formatDate(t.date);
            const formattedValue = formatCurrency(t.amount);

            tr.innerHTML = `
                <td class="px-5 py-3 whitespace-nowrap" style="color:var(--app-muted)">${formattedDate}</td>
                <td class="px-5 py-3 font-semibold" style="color:var(--app-heading)">${escapeHtml(t.description)}</td>
                <td class="px-5 py-3" style="color:#5b6d80">${t.category ? escapeHtml(t.category.name) : '-'}</td>
                <td class="px-5 py-3"><span class="${isIncome ? 'pill-income' : 'pill-expense'} text-[11px] font-bold px-[9px] py-[3px] rounded-xl">${typeLabel}</span></td>
                <td class="px-5 py-3 text-right font-bold whitespace-nowrap" style="color:${isIncome ? 'var(--app-success)' : 'var(--app-heading)'}">
                    ${symbol} R$ ${formattedValue}
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-red-600">Erro ao carregar prévia.</td></tr>';
    }
}

async function downloadReport(type) {
    const year = document.getElementById("report-year").value;
    const month = document.getElementById("report-month").value;

    const endpoint = type === 'pdf' ? 'pdf' : 'excel';

    try {
        const response = await apiFetch(`/api/reports/${endpoint}?year=${year}&month=${month}`, {
            method: 'GET'
        });

        if (!response.ok) {
            showToast("Erro ao gerar relatório. Verifique se há dados para este período.", "error");
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
        showToast("Erro ao conectar com o servidor.", "error");
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
