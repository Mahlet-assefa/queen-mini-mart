# Queen Mart setup

Follow [README.md](README.md#run-locally) for the local commands. The frontend is in `mini_mart/frontend` and the backend is in `mini_mart/backend`; each has its own package and environment example for separate deployment.

New databases receive an admin placeholder and standard categories. Run `npm run db:seed` only if you want sample products. Local products and sales do not move to a hosted database automatically.

Sign-in uses email and password; SMTP is not needed. Set the admin password with `ADMIN_PASSWORD='your-long-password' npm run db:admin` after migrations. Production also requires a stable `SESSION_SECRET`. For TablePlus, connect to `127.0.0.1:5432`, database `mini_mart`, user `mini_mart`, password `mini_mart`.
