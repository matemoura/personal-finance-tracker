CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_category_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);
