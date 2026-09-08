const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

function makeInput(id) {
  const input = document.createElement("input");
  input.id = id;
  document.body.appendChild(input);
  return input;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("setFieldError / clearFieldError", () => {
  test("creates an inline error message linked via aria-describedby", () => {
    const field = makeInput("amount");

    setFieldError("amount", "Informe um valor válido.");

    const errorEl = document.getElementById("amount-error");
    expect(errorEl.textContent).toBe("Informe um valor válido.");
    expect(errorEl.classList.contains("visible")).toBe(true);
    expect(errorEl.getAttribute("role")).toBe("alert");
    expect(field.classList.contains("field-invalid")).toBe(true);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toBe("amount-error");
  });

  test("reuses the same error element on a second call instead of duplicating it", () => {
    makeInput("amount");

    setFieldError("amount", "Primeiro erro.");
    setFieldError("amount", "Segundo erro.");

    expect(document.querySelectorAll("#amount-error").length).toBe(1);
    expect(document.getElementById("amount-error").textContent).toBe("Segundo erro.");
  });

  test("clearFieldError hides the message and resets invalid state", () => {
    const field = makeInput("amount");
    setFieldError("amount", "Erro.");

    clearFieldError("amount");

    expect(document.getElementById("amount-error").classList.contains("visible")).toBe(false);
    expect(field.classList.contains("field-invalid")).toBe(false);
    expect(field.hasAttribute("aria-invalid")).toBe(false);
  });

  test("silently no-ops for a field that doesn't exist in the DOM", () => {
    expect(() => setFieldError("nope", "x")).not.toThrow();
    expect(() => clearFieldError("nope")).not.toThrow();
  });
});

describe("clearFieldErrors", () => {
  test("clears every field id in the list", () => {
    makeInput("a");
    makeInput("b");
    setFieldError("a", "erro a");
    setFieldError("b", "erro b");

    clearFieldErrors(["a", "b"]);

    expect(document.getElementById("a-error").classList.contains("visible")).toBe(false);
    expect(document.getElementById("b-error").classList.contains("visible")).toBe(false);
  });
});

describe("validateFields", () => {
  test("returns true and clears errors when every check passes", () => {
    const description = makeInput("description");
    const amount = makeInput("amount");
    setFieldError("description", "old error");

    const result = validateFields([
      { id: "description", valid: true, message: "Digite uma descrição." },
      { id: "amount", valid: true, message: "Informe um valor válido." },
    ]);

    expect(result).toBe(true);
    expect(description.classList.contains("field-invalid")).toBe(false);
  });

  test("returns false, flags every invalid field, and focuses the first one", () => {
    const description = makeInput("description");
    const amount = makeInput("amount");
    description.focus = jest.fn();

    const result = validateFields([
      { id: "description", valid: false, message: "Digite uma descrição." },
      { id: "amount", valid: false, message: "Informe um valor válido." },
    ]);

    expect(result).toBe(false);
    expect(document.getElementById("description-error").textContent).toBe("Digite uma descrição.");
    expect(document.getElementById("amount-error").textContent).toBe("Informe um valor válido.");
    expect(description.focus).toHaveBeenCalledTimes(1);
  });

  test("focuses only the FIRST invalid field, not later ones", () => {
    const description = makeInput("description");
    const amount = makeInput("amount");
    description.focus = jest.fn();
    amount.focus = jest.fn();

    validateFields([
      { id: "description", valid: false, message: "Digite uma descrição." },
      { id: "amount", valid: false, message: "Informe um valor válido." },
    ]);

    expect(description.focus).toHaveBeenCalledTimes(1);
    expect(amount.focus).not.toHaveBeenCalled();
  });
});
