-- Dia de fechamento diferente do padrão do cartão, valendo só pra UM mês.
-- (year, month) é o mês em que a compra foi feita: é o fechamento desse mês
-- que decide se a compra entra na fatura dele ou na do mês seguinte. Sem
-- linha aqui, o mês segue o closing_day normal do cartão.
CREATE TABLE card_closing_overrides (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    closing_day INTEGER NOT NULL,
    CONSTRAINT uq_card_closing_override UNIQUE (card_id, year, month)
);
