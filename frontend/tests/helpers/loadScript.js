const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

// Os arquivos em frontend/js/ são scripts clássicos (sem export/import),
// pensados pra rodar via <script> direto no navegador — cada function
// declarada no topo vira global. Pra testar essas mesmas functions aqui,
// carregamos o arquivo com eval indireto ("(0, eval)"): por especificação da
// linguagem, eval indireto sempre roda no escopo global do realm atual (o
// jsdom, no ambiente de teste do Jest), então "function foo(){}" no arquivo
// vira "global.foo" — igual ao navegador, sem precisar reescrever os arquivos
// como módulos.
//
// Só que carregar assim passa longe do pipeline normal do Jest (require +
// babel-jest), que é de onde vem a instrumentação de cobertura — sem isso,
// "jest --coverage" mostraria 0% mesmo com os testes rodando de verdade.
// Por isso instrumentamos o código nós mesmos com babel-plugin-istanbul antes
// do eval: os contadores injetados escrevem em global.__coverage__, o mesmo
// formato que o reporter de cobertura do Jest já sabe ler.
function loadScript(relativePath) {
  const fullPath = path.join(__dirname, "..", "..", relativePath);
  const code = fs.readFileSync(fullPath, "utf8");

  const instrumented = babel.transform(code, {
    filename: fullPath,
    babelrc: false,
    configFile: false,
    plugins: [["istanbul", { cwd: path.join(__dirname, "..", "..") }]],
  }).code;

  (0, eval)(instrumented); // eslint-disable-line no-eval
}

module.exports = { loadScript };
