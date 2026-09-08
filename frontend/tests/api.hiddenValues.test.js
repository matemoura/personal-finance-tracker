const { loadScript } = require("./helpers/loadScript");

// "valuesHidden" é lido do localStorage uma única vez, no momento em que o
// script carrega — por isso esse arquivo fica separado dos outros testes e
// semeia o localStorage ANTES de loadScript, simulando alguém que já tinha
// ativado "ocultar valores" numa visita anterior.
beforeAll(() => {
  localStorage.setItem("hideValues", "true");
  loadScript("js/api.js");
});

test("formatCurrency masks the value when values are hidden", () => {
  expect(formatCurrency(1234.5)).toBe("••••");
});

test("animateCount shows the masked placeholder instead of animating", () => {
  const el = document.createElement("span");
  animateCount(el, 999);
  expect(el.textContent).toBe("R$ ••••");
});
