# Finance Tracker

Rastreador de finanças pessoais: transações, contas a pagar, empréstimos entre pessoas, cartões com fatura por competência (compras parceladas caem na fatura certa) e relatórios exportáveis. Backend em Spring Boot, frontend estático sem framework.

## Stack

**Backend** — Java 17, Spring Boot 3.5.9, Spring Security (JWT via `jjwt`), Spring Data JPA, Flyway (migrations versionadas), PostgreSQL (Supabase), OpenPDF e Apache POI (exportação de relatórios em PDF/Excel), Spring Mail (recuperação de senha por e-mail).

**Frontend** — HTML/CSS/JavaScript sem build step em tempo de execução (sem framework, sem bundler). Tailwind CSS é compilado localmente (`npm run build:css`) e o CSS resultante é versionado — não há dependência de CDN em produção. Tema claro/escuro via variáveis CSS, tour guiado de onboarding, formulários com validação inline.

**Infra** — Frontend na Vercel (estático), backend no Render, banco no Supabase Postgres (via connection pooler), fotos de perfil no Supabase Storage.

## Funcionalidades

- Autenticação por e-mail/senha (JWT), cadastro, recuperação de senha por e-mail
- Transações de receita/despesa, com compras parceladas no cartão (cada parcela cai automaticamente na fatura certa, considerando o dia de fechamento do cartão)
- Cartões de crédito: fatura por competência, pagamento de fatura
- Contas a pagar com vencimento e lembretes
- Empréstimos entre pessoas: valor emprestado, recebimentos parciais, status
- Dashboard com resumo do mês, evolução de saldo e despesas por categoria
- Relatórios mensais exportáveis em PDF e Excel
- Categorias personalizadas por usuário
- Modo de privacidade (ocultar valores na tela)

## Estrutura

```
backend/
  src/main/java/.../controller/   endpoints REST (auth, transações, contas, cartões, empréstimos, relatórios...)
  src/main/java/.../service/      regras de negócio
  src/main/resources/db/migration/  migrations Flyway (V1...Vn)
  scripts/                        scripts SQL manuais de correção pontual (não rodam automaticamente)
frontend/
  *.html                          uma página por área (dashboard, transações, contas, empréstimos, relatórios, login...)
  js/                             um arquivo JS por página + api.js (helpers compartilhados: fetch autenticado, toasts, tour, animações)
  css/app.css                     tokens de tema (cor, tipografia) e componentes
  css/tailwind-input.css          entrada do build do Tailwind (saída: css/tailwind.css, versionada)
```

## Rodando localmente

### Backend

Requer Java 17, Maven (ou o wrapper `mvnw` incluso) e um Postgres acessível.

```bash
cd backend
./mvnw spring-boot:run
```

Sem variáveis de ambiente, sobe com os defaults do `application.yml` (Postgres local em `localhost:5432/finance_db`). Para usar Supabase ou customizar qualquer coisa, copie `backend/.env.example` como referência e exporte as variáveis equivalentes antes de subir — o Spring Boot não lê arquivo `.env` diretamente, então elas precisam estar no ambiente (ou no `application-local.yml`, se preferir).

Migrations do Flyway rodam automaticamente no start.

### Frontend

Sem servidor de build. Compile o CSS uma vez (ou sempre que mexer em classes Tailwind novas):

```bash
cd frontend
npm install
npm run build:css
```

Depois é só servir os arquivos estáticos (Live Server, `python -m http.server`, etc.) e abrir `index.html`. Ajuste `API_URL` em `frontend/js/api.js` se o backend não estiver em `localhost:8080`.

## Variáveis de ambiente (produção)

Ver `backend/.env.example` para a lista completa com comentários. Nenhuma é lida de arquivo em produção — todas ficam cadastradas no painel do host (Render).

## Testes e cobertura

**Backend** — JUnit + Mockito, cobertura via JaCoCo:

```bash
cd backend
./mvnw test
```

O relatório html fica em `backend/target/site/jacoco/index.html` depois do `test` (gerado automaticamente, sem flag extra).

**Frontend** — Jest + jsdom. Os arquivos em `frontend/js/` são scripts clássicos (sem `import`/`export`, pensados pra `<script>` direto no navegador); os testes carregam cada um via `frontend/tests/helpers/loadScript.js`, que injeta o código no ambiente global do jsdom — igual ao navegador faria — em vez de exigir reescrever os arquivos como módulos:

```bash
cd frontend
npm install
npm test               # roda a suíte
npm run test:coverage  # roda com relatório de cobertura (texto no terminal + html em frontend/coverage/)
```

Cobertura hoje é forte em `js/api.js` (helpers compartilhados por todas as páginas: validação, formatação de moeda, animações, tour guiado, lembretes de vencimento, sessão/autenticação) — os arquivos JS específicos de cada página (`dashboard.js`, `transactions.js`, etc., em sua maioria controllers de UI fortemente acoplados ao DOM de cada tela) ainda não têm testes; é o próximo passo natural pra ampliar a cobertura.
