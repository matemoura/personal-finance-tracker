const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.useRealTimers();
});

function mockReducedMotion(matches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query.includes("reduce") ? matches : false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

describe("prefersReducedMotion", () => {
  test("reflects prefers-reduced-motion: reduce", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  test("is false when the OS has no such preference", () => {
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("animateCount", () => {
  test("does nothing when the element is missing", () => {
    expect(() => animateCount(null, 100)).not.toThrow();
  });

  test("reduced motion: sets the final formatted value immediately, no animation", () => {
    mockReducedMotion(true);
    const el = document.createElement("span");

    animateCount(el, 1234.5);

    expect(el.textContent).toBe("R$ 1.234,50");
  });

  test("respects a custom prefix", () => {
    mockReducedMotion(true);
    const el = document.createElement("span");

    animateCount(el, 10, "");

    expect(el.textContent).toBe("10,00");
  });

  test("animated: does not show the final value on the very first frame, but converges to it", () => {
    mockReducedMotion(false);
    jest.useFakeTimers();
    const el = document.createElement("span");

    animateCount(el, 100);

    // requestAnimationFrame só roda no próximo frame — nada ainda foi
    // desenhado de forma síncrona, diferente do modo "reduced motion".
    expect(el.textContent).toBe("");

    jest.advanceTimersByTime(700);

    expect(el.textContent).toBe("R$ 100,00");
  });
});

describe("staggerRowEntrance", () => {
  test("does nothing when the container is missing", () => {
    expect(() => staggerRowEntrance(null)).not.toThrow();
  });

  test("reduced motion: marks every row entered immediately, no stagger delay", () => {
    mockReducedMotion(true);
    const container = document.createElement("div");
    const row1 = document.createElement("div");
    const row2 = document.createElement("div");
    container.append(row1, row2);

    staggerRowEntrance(container, "ledger-row-table");

    expect(row1.classList.contains("ledger-row-table")).toBe(true);
    expect(row1.classList.contains("entered")).toBe(true);
    expect(row2.classList.contains("entered")).toBe(true);
    expect(row1.style.animationDelay).toBe("");
  });

  test("animated: staggers the delay by row index, capped at maxDelayIndex", () => {
    mockReducedMotion(false);
    jest.useFakeTimers();
    const container = document.createElement("div");
    const rows = [0, 1, 2].map(() => document.createElement("div"));
    container.append(...rows);

    staggerRowEntrance(container, "ledger-row", 1);

    expect(rows[0].style.animationDelay).toBe("0ms");
    expect(rows[1].style.animationDelay).toBe("45ms");
    // índice 2 é limitado pelo maxDelayIndex=1, então usa o mesmo delay do índice 1.
    expect(rows[2].style.animationDelay).toBe("45ms");

    jest.advanceTimersByTime(50);
    expect(rows[0].classList.contains("entered")).toBe(true);
  });
});

describe("stampConfirmation", () => {
  test("calls onDone immediately when the mark element doesn't exist", () => {
    const onDone = jest.fn();
    stampConfirmation("missing-mark", onDone);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("reduced motion: calls onDone immediately without toggling the 'stamped' class", () => {
    mockReducedMotion(true);
    const mark = document.createElement("div");
    mark.id = "stamp";
    document.body.appendChild(mark);
    const onDone = jest.fn();

    stampConfirmation("stamp", onDone);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mark.classList.contains("stamped")).toBe(false);
  });

  test("animated: adds 'stamped' immediately, but only calls onDone after the delay", () => {
    mockReducedMotion(false);
    jest.useFakeTimers();
    const mark = document.createElement("div");
    mark.id = "stamp";
    document.body.appendChild(mark);
    const onDone = jest.fn();

    stampConfirmation("stamp", onDone);

    expect(mark.classList.contains("stamped")).toBe(true);
    expect(onDone).not.toHaveBeenCalled();

    jest.advanceTimersByTime(420);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
