const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

function mockSystemDark(matches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query.includes("dark") ? matches : false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

describe("getStoredTheme / getEffectiveTheme", () => {
  test("no stored preference and a light system: effective theme is light", () => {
    mockSystemDark(false);
    expect(getStoredTheme()).toBeNull();
    expect(getEffectiveTheme()).toBe("light");
  });

  test("no stored preference but a dark system: effective theme is dark", () => {
    mockSystemDark(true);
    expect(getEffectiveTheme()).toBe("dark");
  });

  test("an explicit stored choice always wins over the system preference", () => {
    mockSystemDark(true);
    localStorage.setItem("theme", "light");
    expect(getEffectiveTheme()).toBe("light");
  });
});

describe("toggleTheme / applyStoredTheme", () => {
  test("toggling from no stored preference (light system) switches to dark and stamps the root", () => {
    mockSystemDark(false);

    toggleTheme();

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("toggling twice returns to light", () => {
    mockSystemDark(false);

    toggleTheme();
    toggleTheme();

    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("updateThemeIcons", () => {
  function makeThemeButton(spanId) {
    const button = document.createElement("button");
    const span = document.createElement("span");
    span.id = spanId;
    button.appendChild(span);
    document.body.appendChild(button);
    return { button, span };
  }

  test("shows the sun icon and a matching aria-label in dark mode", () => {
    mockSystemDark(false);
    localStorage.setItem("theme", "dark");
    const { button, span } = makeThemeButton("theme-icon-desktop");

    updateThemeIcons();

    expect(span.innerHTML).toContain("<svg");
    expect(button.getAttribute("aria-label")).toBe("Mudar para tema claro");
  });

  test("shows the moon icon and a matching aria-label in light mode", () => {
    mockSystemDark(false);
    localStorage.setItem("theme", "light");
    const { button, span } = makeThemeButton("theme-icon-desktop");

    updateThemeIcons();

    expect(span.innerHTML).toContain("<svg");
    expect(button.getAttribute("aria-label")).toBe("Mudar para tema escuro");
  });

  test("updates both the desktop and mobile icon elements when both exist", () => {
    mockSystemDark(false);
    localStorage.setItem("theme", "dark");
    const desktop = makeThemeButton("theme-icon-desktop");
    const mobile = makeThemeButton("theme-icon-mobile");

    updateThemeIcons();

    expect(desktop.span.innerHTML).toBe(mobile.span.innerHTML);
  });

  test("does nothing when neither icon element exists on the page", () => {
    expect(() => updateThemeIcons()).not.toThrow();
  });
});
