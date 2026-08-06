CREATE TABLE card_invoice_payments (
    id BIGSERIAL PRIMARY KEY,
    card_id BIGINT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    paid_date DATE NOT NULL,
    CONSTRAINT fk_invoice_payment_card
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT uq_invoice_payment_card_month
        UNIQUE (card_id, year, month)
);
