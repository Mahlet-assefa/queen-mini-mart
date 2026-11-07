ALTER TABLE qm_users ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;
UPDATE qm_users SET must_change_password = true WHERE role = 'admin';
