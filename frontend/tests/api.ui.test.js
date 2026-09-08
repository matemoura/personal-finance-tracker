const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.useRealTimers();
});

describe("toggleInstallmentFields", () => {
  test("shows the installment fields when the checkbox is checked", () => {
    document.body.innerHTML = `
      <input type="checkbox" id="isInstallment" checked>
      <div id="installmentFields" class="hidden"></div>
    `;

    toggleInstallmentFields();

    expect(document.getElementById("installmentFields").classList.contains("hidden")).toBe(false);
  });

  test("hides the installment fields when the checkbox is unchecked", () => {
    document.body.innerHTML = `
      <input type="checkbox" id="isInstallment">
      <div id="installmentFields"></div>
    `;

    toggleInstallmentFields();

    expect(document.getElementById("installmentFields").classList.contains("hidden")).toBe(true);
  });

  test("does nothing when the checkbox or the fields container is missing", () => {
    expect(() => toggleInstallmentFields()).not.toThrow();
  });
});

describe("toggleMobileNavMenu / toggleDueReminders", () => {
  test("toggleMobileNavMenu flips the hidden class on the nav menu", () => {
    document.body.innerHTML = `<div id="mobile-nav-menu" class="hidden"></div>`;
    toggleMobileNavMenu();
    expect(document.getElementById("mobile-nav-menu").classList.contains("hidden")).toBe(false);
    toggleMobileNavMenu();
    expect(document.getElementById("mobile-nav-menu").classList.contains("hidden")).toBe(true);
  });

  test("toggleDueReminders flips the hidden class on the reminders panel", () => {
    document.body.innerHTML = `<div id="due-reminders-panel" class="hidden"></div>`;
    toggleDueReminders();
    expect(document.getElementById("due-reminders-panel").classList.contains("hidden")).toBe(false);
  });
});

describe("updateHideValuesIcon", () => {
  function makeEyeButton(spanId) {
    const button = document.createElement("button");
    const span = document.createElement("span");
    span.id = spanId;
    button.appendChild(span);
    document.body.appendChild(button);
    return { button, span };
  }

  test("renders an icon and an aria-label reflecting the current hidden state", () => {
    const { button, span } = makeEyeButton("hide-values-icon-desktop");

    updateHideValuesIcon();

    expect(span.innerHTML).toContain("<svg");
    expect(["Mostrar valores", "Ocultar valores"]).toContain(button.getAttribute("aria-label"));
  });
});

describe("renderDueReminders", () => {
  function makeRemindersFixture() {
    document.body.innerHTML = `
      <span id="due-reminders-badge-desktop" class="hidden"></span>
      <span id="due-reminders-badge-mobile" class="hidden"></span>
      <div id="due-reminders-list"></div>
    `;
  }

  test("shows an empty state and hides the badges when there's nothing due", () => {
    makeRemindersFixture();

    renderDueReminders([]);

    expect(document.getElementById("due-reminders-badge-desktop").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("due-reminders-list").textContent).toContain("Nada vencendo");
  });

  test("shows the count on both badges and renders one link per item", () => {
    makeRemindersFixture();

    renderDueReminders([
      { page: "bills.html", label: "Conta de luz", amount: 214.8, date: "2026-09-10" },
      { page: "transactions.html", label: "Cartão Nubank", amount: 512, date: "2026-09-12" },
    ]);

    const badgeDesktop = document.getElementById("due-reminders-badge-desktop");
    expect(badgeDesktop.textContent).toBe("2");
    expect(badgeDesktop.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("due-reminders-badge-mobile").textContent).toBe("2");

    const list = document.getElementById("due-reminders-list");
    expect(list.querySelectorAll("a")).toHaveLength(2);
    expect(list.textContent).toContain("Conta de luz");
    expect(list.textContent).toContain("214,80");
  });

  test("caps the badge count display at '9+'", () => {
    makeRemindersFixture();
    const items = Array.from({ length: 12 }, (_, i) => ({ page: "bills.html", label: `Conta ${i}`, amount: 10 }));

    renderDueReminders(items);

    expect(document.getElementById("due-reminders-badge-desktop").textContent).toBe("9+");
  });

  test("escapes an item's label instead of injecting raw HTML", () => {
    makeRemindersFixture();

    renderDueReminders([{ page: "bills.html", label: "<b>hack</b>", amount: 10 }]);

    const list = document.getElementById("due-reminders-list");
    expect(list.innerHTML).not.toContain("<b>hack</b>");
    expect(list.innerHTML).toContain("&lt;b&gt;hack&lt;/b&gt;");
  });
});

describe("setupMoneyInput", () => {
  test("reformats digits typed into the amount field as pt-BR currency", () => {
    document.body.innerHTML = `<input id="amount">`;
    setupMoneyInput();

    const input = document.getElementById("amount");
    input.value = "12345";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));

    expect(input.value).toBe("123,45");
  });

  test("does nothing when there's no amount field on the page", () => {
    expect(() => setupMoneyInput()).not.toThrow();
  });
});

describe("showToast", () => {
  test("creates the toast container on first use and appends a message", () => {
    jest.useFakeTimers();

    showToast("Categoria criada com sucesso!", "success");

    const container = document.getElementById("toast-container");
    expect(container).not.toBeNull();
    expect(container.textContent).toContain("Categoria criada com sucesso!");
  });

  test("removes the toast from the DOM after its timeout", () => {
    jest.useFakeTimers();

    showToast("Erro ao salvar.", "error");
    const container = document.getElementById("toast-container");

    jest.advanceTimersByTime(3500 + 300);

    expect(container.children.length).toBe(0);
  });

  test("reuses the same container across multiple toasts", () => {
    jest.useFakeTimers();

    showToast("Primeiro", "info");
    showToast("Segundo", "info");

    const containers = document.querySelectorAll("#toast-container");
    expect(containers).toHaveLength(1);
    expect(containers[0].children.length).toBe(2);
  });
});
