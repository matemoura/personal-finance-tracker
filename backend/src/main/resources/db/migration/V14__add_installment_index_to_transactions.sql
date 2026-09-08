-- Guarda o índice (a partir de 0) e o total de parcelas de uma compra
-- parcelada, calculado só uma vez na criação. Antes disso, editar qualquer
-- campo de uma parcela recalculava a fatura a partir de um índice fantasma
-- (sempre 0, porque nada era persistido), jogando a parcela de volta pro mês
-- base e obrigando a corrigir a data manualmente pra ela voltar pro mês certo.
-- Nulo para transações que não são parcela, ou criadas antes desta coluna existir.
ALTER TABLE transactions ADD COLUMN installment_index INTEGER;
ALTER TABLE transactions ADD COLUMN installment_total INTEGER;
