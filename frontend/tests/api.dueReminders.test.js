const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

beforeEach(() => {
  document.body.innerHTML = `
    <span id="due-reminders-badge-desktop" class="hidden"></span>
    <span id="due-reminders-badge-mobile" class="hidden"></span>
    <div id="due-reminders-list"></div>
  `;
  localStorage.clear();
  global.fetch = jest.fn();
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8)); // 08/09/2026
});

afterEach(() => {
  jest.useRealTimers();
});

function mockBillsAndCards(bills, cards) {
  global.fetch.mockImplementation((url) => {
    if (url.includes("/api/bills")) {
      return Promise.resolve({ ok: true, json: async () => bills });
    }
    if (url.includes("/api/cards")) {
      return Promise.resolve({ ok: true, json: async () => cards });
    }
    return Promise.resolve({ ok: false });
  });
}

describe("checkDueReminders", () => {
  test("does nothing without a token, even with a badge on the page", async () => {
    await checkDueReminders();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("does nothing when the page has no reminders badge at all", async () => {
    localStorage.setItem("token", "abc");
    document.body.innerHTML = "";
    await checkDueReminders();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("includes a bill due within the next 7 days", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [{ status: "PENDING", description: "Conta de luz", amount: 200, dueDate: "2026-09-12" }],
      []
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-badge-desktop").textContent).toBe("1");
    expect(document.getElementById("due-reminders-list").textContent).toContain("Conta de luz");
  });

  test("excludes a bill due more than 7 days out", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [{ status: "PENDING", description: "Conta distante", amount: 200, dueDate: "2026-10-01" }],
      []
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-badge-desktop").classList.contains("hidden")).toBe(true);
  });

  test("includes an overdue bill regardless of how far in the past it is", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [{ status: "OVERDUE", description: "Conta atrasada", amount: 50, dueDate: "2026-01-05" }],
      []
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-list").textContent).toContain("Conta atrasada");
  });

  test("excludes an already-paid bill even if its due date would otherwise qualify", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [{ status: "PAID", description: "Já paga", amount: 50, dueDate: "2026-09-09" }],
      []
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-badge-desktop").classList.contains("hidden")).toBe(true);
  });

  test("includes a card invoice with a pending balance due soon", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [],
      [{ name: "Nubank", dueDay: 10, pendingCurrentMonth: 512 }]
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-list").textContent).toContain("Nubank");
  });

  test("excludes a card with nothing pending this month", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [],
      [{ name: "Nubank", dueDay: 10, pendingCurrentMonth: 0 }]
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-badge-desktop").classList.contains("hidden")).toBe(true);
  });

  test("combines bills and card invoices into a single reminder count", async () => {
    localStorage.setItem("token", "abc");
    mockBillsAndCards(
      [{ status: "PENDING", description: "Água", amount: 90, dueDate: "2026-09-10" }],
      [{ name: "Nubank", dueDay: 12, pendingCurrentMonth: 300 }]
    );

    await checkDueReminders();

    expect(document.getElementById("due-reminders-badge-desktop").textContent).toBe("2");
  });

  test("leaves the reminders untouched if either request fails", async () => {
    localStorage.setItem("token", "abc");
    global.fetch.mockResolvedValue({ ok: false });

    await checkDueReminders();

    // Continua no estado inicial (nunca preenchido) — não deve derrubar a página.
    expect(document.getElementById("due-reminders-badge-desktop").classList.contains("hidden")).toBe(true);
  });
});
