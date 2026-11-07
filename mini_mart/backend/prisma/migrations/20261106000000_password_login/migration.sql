ALTER TABLE qm_users ADD COLUMN password_hash text;
DROP TABLE IF EXISTS qm_login_codes;
