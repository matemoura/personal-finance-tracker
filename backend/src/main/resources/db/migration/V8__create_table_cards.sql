CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(20),
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_card_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

ALTER TABLE transactions ADD COLUMN card_id BIGINT;

ALTER TABLE transactions ADD CONSTRAINT fk_transaction_card
    FOREIGN KEY (card_id)
    REFERENCES cards(id)
    ON DELETE SET NULL;
