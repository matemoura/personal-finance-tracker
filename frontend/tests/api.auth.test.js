const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  // jsdom não implementa navegação de verdade (window.location.href = ... só
  // gera um aviso e não muda nada) — substitui por um objeto simples pra dar
  // pra checar pra onde o código tentou navegar, sem barulho no console.
  delete window.location;
  window.location = { href: "" };

  loadScript("js/api.js");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "";
  global.fetch = jest.fn();
});

describe("getToken", () => {
  test("reads the token from localStorage", () => {
    localStorage.setItem("token", "abc123");
    expect(getToken()).toBe("abc123");
  });

  test("returns null when there's no token", () => {
    expect(getToken()).toBeNull();
  });
});

describe("forceLogout", () => {
  test("removes the token and redirects to the login page", () => {
    localStorage.setItem("token", "abc123");

    forceLogout();

    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("index.html");
  });

  test("stores an optional message as a login notice for the login page to show", () => {
    forceLogout("Sessão expirada.");
    expect(sessionStorage.getItem("loginNotice")).toBe("Sessão expirada.");
  });

  test("without a message, no login notice is stored", () => {
    forceLogout();
    expect(sessionStorage.getItem("loginNotice")).toBeNull();
  });
});

describe("apiFetch", () => {
  test("injects the Bearer token from localStorage into the request headers", async () => {
    localStorage.setItem("token", "my-token");
    global.fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch("/api/transactions");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/transactions"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer my-token" }) })
    );
  });

  test("makes an unauthenticated request when there's no token", async () => {
    global.fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch("/api/public");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  test("preserves caller-supplied headers alongside the injected token", async () => {
    localStorage.setItem("token", "my-token");
    global.fetch.mockResolvedValue({ status: 200, ok: true });

    await apiFetch("/api/transactions", { headers: { "Content-Type": "application/json" } });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer my-token");
  });

  test("returns the response as-is on success", async () => {
    const fakeResponse = { status: 200, ok: true };
    global.fetch.mockResolvedValue(fakeResponse);

    const result = await apiFetch("/api/transactions");

    expect(result).toBe(fakeResponse);
  });

  test("on a 401, forces logout and throws instead of returning the response", async () => {
    localStorage.setItem("token", "expired-token");
    global.fetch.mockResolvedValue({ status: 401, ok: false });

    await expect(apiFetch("/api/transactions")).rejects.toThrow("Sessão expirada");

    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("index.html");
  });

  test("on a 403, also forces logout and throws", async () => {
    global.fetch.mockResolvedValue({ status: 403, ok: false });
    await expect(apiFetch("/api/transactions")).rejects.toThrow("Sessão expirada");
  });
});

describe("checkSessionAlive", () => {
  // sessionCheckFailures é um contador interno do script (não exposto pro
  // teste) que só zera sozinho numa checagem bem-sucedida — recarregar o
  // script antes de cada teste garante um contador zerado, sem vazar estado
  // de um teste pro outro.
  beforeEach(() => {
    loadScript("js/api.js");
  });

  test("does nothing when there's no token to check", async () => {
    await checkSessionAlive();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("forces logout immediately on a 401 response", async () => {
    localStorage.setItem("token", "expired-token");
    global.fetch.mockResolvedValue({ status: 401 });

    await checkSessionAlive();

    expect(localStorage.getItem("token")).toBeNull();
  });

  test("a single network failure does not log the user out yet", async () => {
    localStorage.setItem("token", "abc123");
    global.fetch.mockRejectedValue(new Error("network down"));

    await checkSessionAlive();

    expect(localStorage.getItem("token")).toBe("abc123");
  });

  test("two consecutive network failures force a logout with an explanatory message", async () => {
    localStorage.setItem("token", "abc123");
    global.fetch.mockRejectedValue(new Error("network down"));

    await checkSessionAlive();
    await checkSessionAlive();

    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("loginNotice")).toContain("Não foi possível conectar");
  });

  test("a successful check resets the failure counter", async () => {
    localStorage.setItem("token", "abc123");
    global.fetch.mockRejectedValueOnce(new Error("blip"));
    await checkSessionAlive();

    global.fetch.mockResolvedValueOnce({ status: 200 });
    await checkSessionAlive();

    global.fetch.mockRejectedValueOnce(new Error("blip again"));
    await checkSessionAlive();

    // Só uma falha desde o reset — ainda não deve ter deslogado.
    expect(localStorage.getItem("token")).toBe("abc123");
  });
});
