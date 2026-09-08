const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
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

// Simula um elemento "visível" (getBoundingClientRect com dimensão real) —
// jsdom não faz layout de verdade, então todo retângulo é zerado por padrão.
function makeVisibleTarget(id) {
  const el = document.createElement("button");
  el.id = id;
  el.getBoundingClientRect = () => ({ top: 100, left: 50, width: 120, height: 40, bottom: 140, right: 170 });
  el.scrollIntoView = jest.fn();
  document.body.appendChild(el);
  return el;
}

describe("hasSeenTour / markTourSeen", () => {
  test("a tour never seen returns false", () => {
    expect(hasSeenTour("dashboard")).toBe(false);
  });

  test("markTourSeen persists it so hasSeenTour then returns true", () => {
    markTourSeen("dashboard");
    expect(hasSeenTour("dashboard")).toBe(true);
  });

  test("marking one tour as seen doesn't affect another page's key", () => {
    markTourSeen("dashboard");
    expect(hasSeenTour("bills")).toBe(false);
  });

  test("preserves previously-seen tours when marking a new one (merges, not overwrites)", () => {
    markTourSeen("dashboard");
    markTourSeen("bills");

    expect(hasSeenTour("dashboard")).toBe(true);
    expect(hasSeenTour("bills")).toBe(true);
  });

  test("hasSeenTour tolerates corrupted localStorage JSON", () => {
    localStorage.setItem("toursSeen", "{not valid json");
    expect(hasSeenTour("dashboard")).toBe(false);
  });

  test("markTourSeen with no key is a no-op", () => {
    expect(() => markTourSeen(null)).not.toThrow();
  });
});

describe("findVisibleTarget", () => {
  test("returns null when no element matches", () => {
    expect(findVisibleTarget("#nope")).toBeNull();
  });

  test("skips a zero-size (hidden) match and returns the visible one", () => {
    const hidden = document.createElement("div");
    hidden.className = "dup-target";
    // getBoundingClientRect padrão do jsdom já é zerado — não precisa mockar.
    document.body.appendChild(hidden);

    const visible = makeVisibleTarget("visible-one");
    visible.className = "dup-target";

    const found = findVisibleTarget(".dup-target");
    expect(found).toBe(visible);
  });

  test("returns null when every match is zero-size", () => {
    const hidden = document.createElement("div");
    hidden.className = "dup-target";
    document.body.appendChild(hidden);

    expect(findVisibleTarget(".dup-target")).toBeNull();
  });
});

describe("full tour flow", () => {
  const STEPS = [
    { selector: "#step1", title: "Passo 1", text: "Primeiro passo." },
    { selector: "#step2", title: "Passo 2", text: "Segundo passo." },
  ];

  beforeEach(() => {
    mockReducedMotion(true); // colapsa os setTimeout de posicionamento pra 0ms
    jest.useFakeTimers();
    makeVisibleTarget("step1");
    makeVisibleTarget("step2");
  });

  test("startTour renders the backdrop, highlight and tooltip for step 1", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    expect(document.getElementById("tour-backdrop")).not.toBeNull();
    expect(document.getElementById("tour-highlight")).not.toBeNull();
    const tooltip = document.getElementById("tour-tooltip");
    expect(tooltip.textContent).toContain("Passo 1");
    expect(tooltip.textContent).toContain("Primeiro passo.");
    expect(tooltip.textContent).toContain("Passo 1 de 2");
  });

  test("a tour with no visible step targets never opens", () => {
    document.body.innerHTML = "";
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    expect(document.getElementById("tour-backdrop")).toBeNull();
  });

  test("nextTourStep advances to step 2's content", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    nextTourStep();
    jest.runOnlyPendingTimers();

    const tooltip = document.getElementById("tour-tooltip");
    expect(tooltip.textContent).toContain("Passo 2");
    expect(tooltip.textContent).toContain("Passo 2 de 2");
  });

  test("nextTourStep past the last step finishes the tour and marks it seen", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    nextTourStep(); // -> step 2
    jest.runOnlyPendingTimers();
    nextTourStep(); // além do último -> finishTour()

    expect(document.getElementById("tour-backdrop")).toBeNull();
    expect(document.getElementById("tour-tooltip")).toBeNull();
    expect(hasSeenTour("dashboard")).toBe(true);
  });

  test("prevTourStep goes back to step 1", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();
    nextTourStep();
    jest.runOnlyPendingTimers();

    prevTourStep();
    jest.runOnlyPendingTimers();

    expect(document.getElementById("tour-tooltip").textContent).toContain("Passo 1 de 2");
  });

  test("prevTourStep on the first step does nothing", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    prevTourStep();
    jest.runOnlyPendingTimers();

    expect(document.getElementById("tour-tooltip").textContent).toContain("Passo 1 de 2");
  });

  test("skipTour closes everything and marks the tour as seen without finishing it", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    skipTour();

    expect(document.getElementById("tour-backdrop")).toBeNull();
    expect(hasSeenTour("dashboard")).toBe(true);
  });

  test("Escape key skips the active tour", () => {
    startTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));

    expect(document.getElementById("tour-backdrop")).toBeNull();
    expect(hasSeenTour("dashboard")).toBe(true);
  });

  test("initPageTour only auto-starts when the tour hasn't been seen yet", () => {
    markTourSeen("dashboard");
    initPageTour(STEPS, "dashboard");
    jest.advanceTimersByTime(1000);

    expect(document.getElementById("tour-backdrop")).toBeNull();
  });

  test("initPageTour auto-starts (after its delay) for a page never seen before", () => {
    initPageTour(STEPS, "dashboard");
    jest.advanceTimersByTime(1000);

    expect(document.getElementById("tour-backdrop")).not.toBeNull();
  });

  test("restartTour reopens it even though it was already seen", () => {
    markTourSeen("dashboard");
    restartTour(STEPS, "dashboard");
    jest.runOnlyPendingTimers();

    expect(document.getElementById("tour-backdrop")).not.toBeNull();
  });
});
