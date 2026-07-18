CREATE TABLE loans (
    id BIGSERIAL PRIMARY KEY,
    person_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    date_lent DATE NOT NULL,
    expected_return_date DATE,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_loan_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE TABLE loan_repayments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL,
    CONSTRAINT fk_repayment_loan
        FOREIGN KEY (loan_id)
        REFERENCES loans(id)
        ON DELETE CASCADE
);
