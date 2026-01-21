CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    user_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    CONSTRAINT fk_transaction_user
        FOREIGN KEY (user_id)
            REFERENCES users(id),
    CONSTRAINT fk_transaction_category
        FOREIGN KEY (category_id)
            REFERENCES categories(id)
);
