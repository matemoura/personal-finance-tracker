-- Corrige compras parceladas antigas (criadas antes da parcela guardar a
-- data real + invoice_year/invoice_month separadamente): cada parcela tinha
-- sua "date" empurrada em (número da parcela - 1) meses, então parcela 1
-- sempre ficou com a data certa (nunca foi deslocada) e serve de âncora pra
-- corrigir as demais.
--
-- Só mexe em transações com descrição terminando em " (N/M)" (compras
-- parceladas), com cartão, e que ainda não têm invoice_year/invoice_month
-- preenchidos (ou seja, criadas antes da correção — parcelas novas já saem
-- certas e não são tocadas).
--
-- Este script NÃO roda automaticamente (não é uma migration do Flyway).
-- Rode manualmente no SQL Editor do Supabase, NESTA ORDEM:
--   1) Rode o PASSO 1 e confira se cada parcela foi pareada com a âncora
--      certa (mesma descrição base, valor e cartão) antes de mudar algo.
--      ATENÇÃO: se você comprou o mesmo item, no mesmo cartão, pelo mesmo
--      valor e número de parcelas MAIS DE UMA VEZ, a pareação pode confundir
--      as duas compras — confira esses casos manualmente.
--   2) Só rode o PASSO 2 (UPDATE) depois de revisar o PASSO 1.

-- ============================================================
-- PASSO 1 — Prévia: cada parcela (N>1), sua data atual (errada) e a data
-- correta (a mesma da parcela 1), além da fatura correta calculada a partir
-- dela.
-- ============================================================
WITH installments AS (
    SELECT
        t.id,
        t.user_id,
        t.card_id,
        t.amount,
        t.date,
        t.description,
        t.invoice_year,
        t.invoice_month,
        regexp_replace(t.description, ' \(\d+/\d+\)$', '')            AS base_description,
        (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[1]::int    AS installment_num,
        (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[2]::int    AS installment_total
    FROM transactions t
    WHERE t.description ~ ' \(\d+/\d+\)$'
      AND t.card_id IS NOT NULL
),
anchors AS (
    SELECT user_id, card_id, amount, base_description, installment_total,
           date AS anchor_date, id AS anchor_id
    FROM installments
    WHERE installment_num = 1
)
SELECT
    i.id,
    i.description,
    i.date                                     AS data_atual_errada,
    a.anchor_date                              AS data_correta,
    c.closing_day,
    (CASE
        WHEN EXTRACT(DAY FROM a.anchor_date) >= c.closing_day
            THEN date_trunc('month', a.anchor_date) + INTERVAL '1 month'
        ELSE date_trunc('month', a.anchor_date)
     END + ((i.installment_num - 1) || ' months')::interval)::date AS fatura_correta_mes
FROM installments i
JOIN anchors a
    ON i.user_id = a.user_id
   AND i.card_id = a.card_id
   AND i.amount = a.amount
   AND i.base_description = a.base_description
   AND i.installment_total = a.installment_total
JOIN cards c ON c.id = i.card_id
WHERE i.installment_num > 1
  AND i.invoice_year IS NULL
  AND i.invoice_month IS NULL
ORDER BY i.card_id, a.anchor_id, i.installment_num;

-- ============================================================
-- PASSO 2 — Aplica a correção (só depois de revisar o PASSO 1).
-- ============================================================
-- WITH installments AS (
--     SELECT
--         t.id,
--         t.user_id,
--         t.card_id,
--         t.amount,
--         t.date,
--         t.description,
--         regexp_replace(t.description, ' \(\d+/\d+\)$', '')            AS base_description,
--         (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[1]::int    AS installment_num,
--         (regexp_match(t.description, ' \((\d+)/(\d+)\)$'))[2]::int    AS installment_total
--     FROM transactions t
--     WHERE t.description ~ ' \(\d+/\d+\)$'
--       AND t.card_id IS NOT NULL
-- ),
-- anchors AS (
--     SELECT user_id, card_id, amount, base_description, installment_total,
--            date AS anchor_date, id AS anchor_id
--     FROM installments
--     WHERE installment_num = 1
-- ),
-- corrections AS (
--     SELECT
--         i.id,
--         a.anchor_date AS correct_date,
--         (CASE
--             WHEN EXTRACT(DAY FROM a.anchor_date) >= c.closing_day
--                 THEN date_trunc('month', a.anchor_date) + INTERVAL '1 month'
--             ELSE date_trunc('month', a.anchor_date)
--          END + ((i.installment_num - 1) || ' months')::interval)::date AS invoice_period_date
--     FROM installments i
--     JOIN anchors a
--         ON i.user_id = a.user_id
--        AND i.card_id = a.card_id
--        AND i.amount = a.amount
--        AND i.base_description = a.base_description
--        AND i.installment_total = a.installment_total
--     JOIN cards c ON c.id = i.card_id
--     WHERE i.installment_num > 1
--       AND i.invoice_year IS NULL
--       AND i.invoice_month IS NULL
-- )
-- UPDATE transactions t
-- SET date = corrections.correct_date,
--     invoice_year = EXTRACT(YEAR FROM corrections.invoice_period_date),
--     invoice_month = EXTRACT(MONTH FROM corrections.invoice_period_date)
-- FROM corrections
-- WHERE t.id = corrections.id;
