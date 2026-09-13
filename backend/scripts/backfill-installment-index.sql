-- Preenche installment_index/installment_total nas parcelas criadas ANTES
-- dessas colunas existirem (ver V14__add_installment_index_to_transactions).
-- Sem isso, editar qualquer campo de uma parcela antiga (valor, categoria,
-- cartão...) ainda recalcula a fatura como se fosse a parcela 1 — o mesmo
-- bug de sempre, só que agora restrito a quem não tem o índice gravado.
--
-- NÃO deriva o índice da posição "(N/M)" na descrição. Parece o caminho
-- óbvio, mas quebraria justamente as parcelas que você já corrigiu na mão
-- mudando a data (o jeito de contornar o bug antes desta correção existir):
-- pra essas, a "date" salva já foi empurrada pra frente, então recalcular
-- fatura-base(date) + (N-1) contaria o deslocamento em dobro. Em vez disso,
-- o índice é calculado de trás pra frente: a diferença, em meses, entre a
-- fatura que JÁ ESTÁ salva (presumida correta hoje) e a fatura-base pra essa
-- mesma data — o valor exato que precisa ficar gravado pra reproduzir essa
-- MESMA fatura em qualquer edição futura, sem mexer em valor, data ou
-- fatura de ninguém agora.
--
-- Só mexe em transações com descrição terminando em " (N/M)" (compras
-- parceladas), com cartão, com invoice_year/invoice_month já preenchidos, e
-- que ainda não têm installment_index (parcelas novas, criadas depois da
-- correção, já saem com isso preenchido e não são tocadas).
--
-- Este script NÃO roda automaticamente (não é uma migration do Flyway).
-- Rode manualmente no SQL Editor do Supabase, NESTA ORDEM:
--   1) Rode o PASSO 1 e confira o "computed_installment_index" de cada linha
--      — deve ser 0 pra quem nunca precisou de ajuste, ou um número pequeno
--      (1, 2, 3...) pra quem caiu em fatura(s) futura(s). Desconfie de
--      números negativos ou muito grandes.
--   2) Só rode o PASSO 2 (UPDATE) depois de revisar o PASSO 1.

-- ============================================================
-- PASSO 1 — Prévia: qual installment_index/installment_total cada parcela
-- receberia.
-- ============================================================
WITH candidates AS (
    SELECT
        t.id,
        t.description,
        t.date,
        t.invoice_year,
        t.invoice_month,
        (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[2]::int AS installment_total,
        (CASE
            WHEN EXTRACT(DAY FROM t.date) >= c.closing_day
                THEN date_trunc('month', t.date) + INTERVAL '1 month'
            ELSE date_trunc('month', t.date)
         END)::date AS base_period,
        make_date(t.invoice_year, t.invoice_month, 1) AS current_period
    FROM transactions t
    JOIN cards c ON c.id = t.card_id
    WHERE t.description ~ ' \(\d+/\d+\)$'
      AND t.card_id IS NOT NULL
      AND t.invoice_year IS NOT NULL
      AND t.invoice_month IS NOT NULL
      AND t.installment_index IS NULL
)
SELECT
    id,
    description,
    date,
    base_period,
    current_period                                                             AS fatura_atual_a_preservar,
    installment_total,
    ((EXTRACT(YEAR FROM current_period) - EXTRACT(YEAR FROM base_period)) * 12
        + (EXTRACT(MONTH FROM current_period) - EXTRACT(MONTH FROM base_period)))::int AS computed_installment_index
FROM candidates
ORDER BY id;

-- ============================================================
-- PASSO 2 — Aplica a correção (só depois de revisar o PASSO 1). Não toca em
-- amount, date, invoice_year nem invoice_month — só grava o índice/total.
-- ============================================================
-- WITH candidates AS (
--     SELECT
--         t.id,
--         (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[2]::int AS installment_total,
--         (CASE
--             WHEN EXTRACT(DAY FROM t.date) >= c.closing_day
--                 THEN date_trunc('month', t.date) + INTERVAL '1 month'
--             ELSE date_trunc('month', t.date)
--          END)::date AS base_period,
--         make_date(t.invoice_year, t.invoice_month, 1) AS current_period
--     FROM transactions t
--     JOIN cards c ON c.id = t.card_id
--     WHERE t.description ~ ' \(\d+/\d+\)$'
--       AND t.card_id IS NOT NULL
--       AND t.invoice_year IS NOT NULL
--       AND t.invoice_month IS NOT NULL
--       AND t.installment_index IS NULL
-- ),
-- computed AS (
--     SELECT
--         id,
--         installment_total,
--         ((EXTRACT(YEAR FROM current_period) - EXTRACT(YEAR FROM base_period)) * 12
--             + (EXTRACT(MONTH FROM current_period) - EXTRACT(MONTH FROM base_period)))::int AS computed_installment_index
--     FROM candidates
-- )
-- UPDATE transactions t
-- SET installment_index = computed.computed_installment_index,
--     installment_total = computed.installment_total
-- FROM computed
-- WHERE t.id = computed.id;
