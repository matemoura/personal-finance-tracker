-- Corrige transações cuja data real foi sobrescrita pelo antigo bug de
-- "fatura do cartão" (TransactionService.applyCardBillingCycle), que empurrava
-- a data da compra em +1 mês sempre que o dia da compra fosse >= ao dia de
-- fechamento do cartão. Esse comportamento foi removido do código: agora a
-- data da transação é sempre a data real, e "em qual fatura ela cai" é
-- calculado à parte, sem tocar no dado salvo.
--
-- Este script NÃO roda automaticamente (não é uma migration do Flyway).
-- Rode manualmente no SQL Editor do Supabase, NESTA ORDEM:
--   1) Rode o PASSO 1 e confira as linhas afetadas antes de mudar qualquer coisa.
--   2) Só rode o PASSO 2 (UPDATE) depois de revisar o PASSO 1.

-- ============================================================
-- PASSO 1 — Prévia: quais transações seriam corrigidas e para qual data.
-- "ambigua = true" sinaliza os poucos casos em que a reversão pode não ser
-- exata (compra nos dias 29-31 quando o mês anterior tem menos dias) —
-- confira essas manualmente antes de continuar.
-- ============================================================
SELECT
    t.id,
    t.description,
    t.date                                   AS data_atual_salva,
    c.name                                   AS cartao,
    c.closing_day                            AS dia_fechamento,
    (t.date - INTERVAL '1 month')::date      AS data_real_corrigida,
    EXTRACT(DAY FROM t.date) <>
        EXTRACT(DAY FROM (t.date - INTERVAL '1 month')::date) AS ambigua
FROM transactions t
JOIN cards c ON c.id = t.card_id
WHERE c.closing_day IS NOT NULL
  AND EXTRACT(DAY FROM t.date) >= c.closing_day
ORDER BY t.date DESC;

-- Contagem rápida:
SELECT COUNT(*) AS total_afetadas
FROM transactions t
JOIN cards c ON c.id = t.card_id
WHERE c.closing_day IS NOT NULL
  AND EXTRACT(DAY FROM t.date) >= c.closing_day;

-- ============================================================
-- PASSO 2 — Aplica a correção (só depois de revisar o PASSO 1).
-- ============================================================
-- UPDATE transactions t
-- SET date = (t.date - INTERVAL '1 month')::date
-- FROM cards c
-- WHERE c.id = t.card_id
--   AND c.closing_day IS NOT NULL
--   AND EXTRACT(DAY FROM t.date) >= c.closing_day;
