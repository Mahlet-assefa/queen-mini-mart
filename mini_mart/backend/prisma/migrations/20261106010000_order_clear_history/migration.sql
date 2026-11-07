ALTER TABLE qm_orders ADD COLUMN cleared_at timestamptz;
CREATE INDEX qm_orders_cleared_at_idx ON qm_orders(cleared_at);
