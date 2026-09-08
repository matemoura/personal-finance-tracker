// jsdom não implementa window.matchMedia — sem isso, qualquer código que
// chama prefersReducedMotion() (contagem de números, entrada de linha,
// carimbo de confirmação, tour guiado) quebraria em todo teste. Por padrão
// simula "sem preferência" (matches: false); testes que precisam simular
// prefers-reduced-motion:reduce sobrescrevem window.matchMedia pontualmente.
beforeEach(() => {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});
