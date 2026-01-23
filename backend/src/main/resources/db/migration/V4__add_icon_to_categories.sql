ALTER TABLE categories ADD COLUMN icon VARCHAR(255);

UPDATE categories SET icon = '📃' WHERE icon IS NULL;