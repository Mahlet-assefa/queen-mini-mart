# Queen Mart

Queen Mart is a web app for running a small shop's daily inventory, sales, purchasing, and financial records. It gives sales staff a simple place to record stock changes and gives administrators a broader view of products, profit, and activity. Money is displayed in Ethiopian birr (ETB), and daily reports use the Africa/Addis_Ababa time zone.

## What it does

- **Inventory:** Browse category cards, search products by name or item code, sort by category, track quantities and low-stock thresholds, and record stock additions or sales.
- **Sales and finance:** See today's sales, daily transactions, and administrator reports for daily, weekly, monthly, and yearly sales and net profit.
- **Supplier orders:** Create orders manually, from low-stock items, or by selecting products and quantities. Clear a completed batch while keeping its details in order history. Export the active orders as CSV.
- **Activity tracker:** Browse sales and stock activity by date.
- **Accounts:** Sign in with email and password. The initial administrator is set up with a one-time command and must choose a private password at the next sign-in; people who register in the app receive sales accounts.

Administrators and sales staff can manage products and categories, add or sell stock, and use the inventory dashboard. Categories with products must be emptied before deletion. Administrators can also see purchase prices, profit reports, and the date tracker. Sales accounts see inventory counts and the daily cash summary without purchase costs or profit figures.

## Tech stack

| Part           | Technology                        |
| -------------- | --------------------------------- |
| Frontend       | Next.js, React, TypeScript        |
| API            | Node.js, Express                  |
| Database       | PostgreSQL with Prisma migrations |
| Local database | Docker Compose                    |

The frontend calls `/api` on its own origin. A Next.js rewrite forwards those requests to the Express API, so the browser does not need a separate API URL.

```text
mini_mart/
  frontend/       Next.js app, styles, and components
  backend/        Express API, Prisma schema, and migrations
scripts/          Local frontend and backend runner
tests/            Unit and API integration checks
```

The frontend and backend each have their own `package.json` and lockfile so they can be deployed as separate services. The root package runs them together for local development.

## Run locally

You need Node.js 22, npm, and Docker. From the repository root:

```bash
cp .env.example .env
docker compose up -d --wait db
npm ci
npm run db:generate
npm run db:migrate
ADMIN_PASSWORD='choose-a-long-unique-password' npm run db:admin
npm run dev
```

Replace the example admin password with a private password of at least 10 characters. Also replace `SESSION_SECRET` in `.env` with a long random value. The `.env` file is ignored by Git.

Open the URL printed by Next.js, usually `http://127.0.0.1:3000`. Sign in using `admin@queenmart.com` and the password you set above. A new database has no categories or products; create categories while adding products. `npm run db:seed` can add sample categories and products for a demo. You can also create a sales account from the sign-in screen.

## Useful commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Start the frontend and API locally                |
| `npm run db:migrate` | Apply database migrations                         |
| `npm run db:admin`   | Create or update the single administrator account |
| `npm run db:seed`    | Add optional sample products                      |
| `npm test`           | Run the small unit test suite                     |
| `npm run typecheck`  | Check frontend types                              |
| `npm run build`      | Build the frontend for production                 |

The API integration test (`npm run test:api`) creates records, so run it against a separate test database. See [SETUP.md](SETUP.md) for local database notes.

## Deployment

The app can run with the frontend on Netlify, the API on Render, and PostgreSQL on Neon. See [DEPLOY.md](DEPLOY.md) for the provider settings and deployment order. Set a new production admin password and `SESSION_SECRET`; do not commit database URLs or other secrets. Local Docker data is not transferred to a hosted database automatically.
