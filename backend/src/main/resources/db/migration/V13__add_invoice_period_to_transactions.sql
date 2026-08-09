-- Guarda em qual fatura do cartão a transação cai, independente da data real
-- da compra. Sem isso, uma compra parcelada precisava mentir sobre a própria
-- data (empurrando-a mês a mês) só pra cair na fatura certa — o que fazia a
-- tela mostrar a data errada. Nulo para transações sem cartão, ou para
-- transações antigas criadas antes desta coluna existir (o cálculo antigo,
-- baseado em data + dia de fechamento, continua servindo de fallback pra elas).
ALTER TABLE transactions ADD COLUMN invoice_year INTEGER;
ALTER TABLE transactions ADD COLUMN invoice_month INTEGER;
