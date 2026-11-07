# Queen Mart

Sales, inventory, finance, orders, and activity tracking for a mini-mart.

Clearing orders marks the current orders complete, removes them from the active list, and keeps them in the order details history by clearing day.

## Project layout

- `mini_mart/frontend` — Next.js app. Deploy it with `API_BASE_URL` pointing to the backend.
- `mini_mart/backend` — Express API, Prisma schema, migrations, and optional sample seed.
- Root scripts run both apps together for local development.

## Run locally

```bash
cp .env.example .env
docker compose up -d --wait db
npm install
npm run db:generate
npm run db:migrate
ADMIN_PASSWORD='choose-a-long-unique-password' npm run db:admin
npm run dev
```

Open the Local URL printed by Next.js, usually `http://127.0.0.1:3000`. The API runs on port 4000. Sign in with `admin@queenmart.com` and the password you set in `db:admin`. Sales users can register with email and password. The database starts with one admin placeholder and standard categories, and no products or activity. Run `npm run db:seed` only if you want sample products.

## Deploy separately

Follow [DEPLOY.md](DEPLOY.md) for the Netlify, Render, and Neon setup.

Each folder has its own `package.json` and `.env.example`. Install dependencies in that folder, then run its scripts. Set `API_BASE_URL` on the frontend to the backend origin. Set `DATABASE_URL` and a long, stable `SESSION_SECRET` on the backend. Set `HOST=0.0.0.0` if your host requires an external listener. After deploying the backend and running `db:migrate`, run `db:admin` once with private `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables. That command sets the single admin account password; public signup creates sales accounts only. Keep the same `SESSION_SECRET` across backend restarts. Run `db:admin` again to change the admin password.

## PostgreSQL / TablePlus

| Field    | Value for local Docker |
| -------- | ---------------------- |
| Host     | `127.0.0.1`            |
| Port     | `5432`                 |
| Database | `mini_mart`            |
| User     | `mini_mart`            |
| Password | `mini_mart`            |

Connection string: `postgres://mini_mart:mini_mart@127.0.0.1:5432/mini_mart`.

## Checks

Run `npm test`, `npm run typecheck`, and `npm run build`. With the API and a separate test database running, set `TEST_ADMIN_PASSWORD` and run `npm run test:api` to check auth, product actions, finance periods, and orders. The integration test creates records.
