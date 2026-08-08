-- Preenche o campo "icon" dos cartões já cadastrados com o domínio do banco
-- (usado para buscar a logo real), identificando o banco pelo nome do
-- cartão. Só toca em cartões cujo "icon" atual NÃO parece já ser um domínio
-- (ou seja, não mexe em cartões que você já reeditou manualmente escolhendo
-- um banco na lista).
--
-- Este script NÃO roda automaticamente (não é uma migration do Flyway).
-- Rode manualmente no SQL Editor do Supabase, NESTA ORDEM:
--   1) Rode o PASSO 1 e confira se o banco identificado pra cada cartão está
--      correto antes de mudar qualquer coisa.
--   2) Só rode o PASSO 2 (UPDATE) depois de revisar o PASSO 1.
--
-- Se algum cartão seu não aparecer no PASSO 1 (nome não bate com nenhum
-- banco da lista), é só editá-lo manualmente na tela de Transações.

-- ============================================================
-- PASSO 1 — Prévia: qual domínio seria salvo em cada cartão.
-- ============================================================
SELECT
    id,
    name,
    icon AS icon_atual,
    CASE
        WHEN name ILIKE '%nubank%'                         THEN 'nubank.com.br'
        WHEN name ILIKE '%c6%'                              THEN 'c6bank.com.br'
        WHEN name ILIKE '%itaú%' OR name ILIKE '%itau%'      THEN 'itau.com.br'
        WHEN name ILIKE '%bradesco%'                         THEN 'bradesco.com.br'
        WHEN name ILIKE '%banco do brasil%'                  THEN 'bb.com.br'
        WHEN name ILIKE '%caixa%'                            THEN 'caixa.gov.br'
        WHEN name ILIKE '%santander%'                        THEN 'santander.com.br'
        WHEN name ILIKE '%banco inter%' OR name = 'Inter'    THEN 'bancointer.com.br'
        WHEN name ILIKE '%mercado pago%' OR name ILIKE '%mercadopago%' THEN 'mercadopago.com.br'
        WHEN name ILIKE '%picpay%'                           THEN 'picpay.com'
        WHEN name ILIKE '%neon%'                             THEN 'neon.com.br'
        WHEN name ILIKE '%banco original%' OR name = 'Original' THEN 'original.com.br'
        WHEN name ILIKE '%will bank%' OR name ILIKE '%willbank%' OR name = 'Will' THEN 'willbank.com.br'
        WHEN name ILIKE '%btg%'                              THEN 'btgpactual.com'
        WHEN name = 'XP' OR name ILIKE '%xp investimentos%'  THEN 'xpi.com.br'
        ELSE NULL
    END AS domicilio_identificado
FROM cards
WHERE icon IS NULL OR icon NOT LIKE '%.%'
ORDER BY name;

-- ============================================================
-- PASSO 2 — Aplica a correção (só depois de revisar o PASSO 1).
-- ============================================================
-- UPDATE cards
-- SET icon = CASE
--     WHEN name ILIKE '%nubank%'                         THEN 'nubank.com.br'
--     WHEN name ILIKE '%c6%'                              THEN 'c6bank.com.br'
--     WHEN name ILIKE '%itaú%' OR name ILIKE '%itau%'      THEN 'itau.com.br'
--     WHEN name ILIKE '%bradesco%'                         THEN 'bradesco.com.br'
--     WHEN name ILIKE '%banco do brasil%'                  THEN 'bb.com.br'
--     WHEN name ILIKE '%caixa%'                            THEN 'caixa.gov.br'
--     WHEN name ILIKE '%santander%'                        THEN 'santander.com.br'
--     WHEN name ILIKE '%banco inter%' OR name = 'Inter'    THEN 'bancointer.com.br'
--     WHEN name ILIKE '%mercado pago%' OR name ILIKE '%mercadopago%' THEN 'mercadopago.com.br'
--     WHEN name ILIKE '%picpay%'                           THEN 'picpay.com'
--     WHEN name ILIKE '%neon%'                             THEN 'neon.com.br'
--     WHEN name ILIKE '%banco original%' OR name = 'Original' THEN 'original.com.br'
--     WHEN name ILIKE '%will bank%' OR name ILIKE '%willbank%' OR name = 'Will' THEN 'willbank.com.br'
--     WHEN name ILIKE '%btg%'                              THEN 'btgpactual.com'
--     WHEN name = 'XP' OR name ILIKE '%xp investimentos%'  THEN 'xpi.com.br'
--     ELSE icon
-- END
-- WHERE icon IS NULL OR icon NOT LIKE '%.%';
