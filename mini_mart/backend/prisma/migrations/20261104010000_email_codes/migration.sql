CREATE TABLE qm_login_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  action text NOT NULL CHECK(action IN ('signin','signup')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);
