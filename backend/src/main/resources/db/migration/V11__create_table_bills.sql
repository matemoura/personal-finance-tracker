CREATE TABLE bills (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_date DATE,
    category_id BIGINT NOT NULL,
    card_id BIGINT,
    transaction_id BIGINT,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_bill_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bill_category
        FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_bill_card
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
    CONSTRAINT fk_bill_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);
