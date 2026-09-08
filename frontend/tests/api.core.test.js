const { loadScript } = require("./helpers/loadScript");

beforeAll(() => {
  loadScript("js/api.js");
});

describe("escapeHtml", () => {
  test("escapes the five HTML-sensitive characters", () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;"
    );
  });

  test("returns an empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  test("stringifies non-string values", () => {
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("splitIntoInstallments", () => {
  test("splits an exact multiple evenly", () => {
    expect(splitIntoInstallments(300, 3)).toEqual([100, 100, 100]);
  });

  test("puts the leftover cents on the last installments, summing exactly", () => {
    const parts = splitIntoInstallments(100, 3);
    expect(parts).toEqual([33.33, 33.33, 33.34]);
    const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(sum).toBe(100);
  });

  test("handles a large installment count without losing cents", () => {
    const parts = splitIntoInstallments(1000, 7);
    const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(sum).toBe(1000);
    expect(parts).toHaveLength(7);
  });
});

describe("formatCurrency", () => {
  test("formats using pt-BR thousands/decimal separators", () => {
    expect(formatCurrency(1234.5)).toBe("1.234,50");
  });

  test("always shows two decimal places", () => {
    expect(formatCurrency(10)).toBe("10,00");
  });
});

describe("formatDate", () => {
  test("formats an ISO date string to pt-BR dd/mm/yyyy", () => {
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
  });

  test("returns a dash for an empty/missing date", () => {
    expect(formatDate("")).toBe("-");
    expect(formatDate(null)).toBe("-");
  });
});

describe("parseCurrencyInput", () => {
  test("parses a pt-BR formatted string into a raw number", () => {
    expect(parseCurrencyInput("1.234,50")).toBe(1234.5);
  });

  test("parses a plain digit string as cents", () => {
    expect(parseCurrencyInput("1000")).toBe(10);
  });
});

describe("findBankByDomain / bankEmojiFor / renderCardIcon", () => {
  test("finds a known bank by its domain", () => {
    expect(findBankByDomain("nubank.com.br").name).toBe("Nubank");
  });

  test("returns undefined for an unknown domain", () => {
    expect(findBankByDomain("not-a-bank.com")).toBeUndefined();
  });

  test("bankEmojiFor returns the bank's emoji for a known domain", () => {
    expect(bankEmojiFor("nubank.com.br")).toBe("💜");
  });

  test("bankEmojiFor falls back to the raw icon (or a default) for a custom card", () => {
    expect(bankEmojiFor("🏦")).toBe("🏦");
    expect(bankEmojiFor("")).toBe("💳");
  });

  test("renderCardIcon renders an <img> with a lazy-loading favicon for a known bank", () => {
    const html = renderCardIcon("nubank.com.br", "Meu Nubank", "w-4 h-4");
    expect(html).toContain("<img");
    expect(html).toContain("nubank.com.br");
    expect(html).toContain('alt="Nubank"');
  });

  test("renderCardIcon escapes a custom (non-bank) icon instead of injecting raw HTML", () => {
    const html = renderCardIcon("<b>x</b>", "Cartão", "w-4 h-4");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  test("renderCardIcon falls back to a wallet emoji when there's no icon at all", () => {
    const html = renderCardIcon("", "Cartão", "w-4 h-4");
    expect(html).toContain("💳");
  });
});
