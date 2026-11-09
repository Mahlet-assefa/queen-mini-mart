ALTER TABLE qm_products ADD COLUMN item_code text;
CREATE UNIQUE INDEX qm_products_item_code_key ON qm_products(item_code);
