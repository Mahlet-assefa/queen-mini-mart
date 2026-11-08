# Deploy Queen Mart: Netlify + Render + Neon

The frontend and backend are separate projects in this repository. Deploy from a GitHub repository; keep `.env` files out of Git.

## 1. Publish the code

Create a GitHub repository and push the project source to it. Check `git status` before pushing: `.env` files and `node_modules` must not appear.

## 2. Create Neon PostgreSQL

Create a Neon project in **Frankfurt**. Run `neon init` and `neon deploy` from the repository root to link the project and pull its connection strings into the ignored root `.env`. `DATABASE_URL` is pooled for app queries; `DATABASE_URL_UNPOOLED` is direct for Prisma migrations. Keep both strings private.

To initialize the production database from this computer after `neon deploy`:

```bash
npm run db:generate
npm run db:migrate
ADMIN_PASSWORD='choose-a-long-unique-password' npm run db:admin
```

The commands use the Neon URLs in the root `.env`; the admin command uses the default `admin@queenmart.com` unless you set `ADMIN_EMAIL`. Replace the example password with a private password of at least 10 characters. `db:migrate` creates the tables without starter categories; `db:admin` sets the handoff password and requires the admin to choose a new one at the next sign-in. The local Docker data is **not** copied to Neon by these commands.

## 3. Deploy the Render API

Create a **Web Service** from the same GitHub repository:

| Setting           | Value                           |
| ----------------- | ------------------------------- |
| Root directory    | `mini_mart/backend`             |
| Language          | Node                            |
| Region            | Frankfurt                       |
| Build command     | `npm ci && npm run db:generate` |
| Start command     | `npm start`                     |
| Health check path | `/api/health`                   |

Set these environment variables in Render:

| Variable                | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`          | The pooled Neon connection string                                |
| `DATABASE_URL_UNPOOLED` | The direct Neon connection string for migrations                 |
| `SESSION_SECRET`        | A new, long random secret that stays the same across deployments |
| `HOST`                  | `0.0.0.0`                                                        |
| `NODE_VERSION`          | `22.22.0`                                                        |

Do not set `ADMIN_PASSWORD` on the running service. Render supplies `PORT`. A paid Render service can use `npm run db:migrate` as a pre-deploy command for later schema changes; Render Free has no pre-deploy command, so run migrations from this computer before deploying updated code. Copy the resulting `https://...onrender.com` URL and check `/api/health` returns `{"ok":true}`.

Render Free sleeps after inactivity and can take about a minute to wake. Netlify's proxy times out after 26 seconds, so a paid, always-on Render service is recommended for daily store use.

## 4. Deploy the Netlify frontend

Import the same GitHub repository as a Netlify site. Set the base directory to `mini_mart/frontend` so it uses that folder's `package.json` and lockfile. Select Next.js; use `npm run build` as the build command and `.next` as the publish directory. Set the `API_BASE_URL` environment variable to the **public HTTPS Render URL**, with no trailing slash, then deploy.

The browser uses `/api` on the Netlify domain. Next.js forwards those requests to Render, so the backend URL is configured on Netlify and the database URL stays only on Render. If you change `API_BASE_URL`, redeploy the Netlify site.

## 5. Check the live app

1. Visit `https://YOUR-NETLIFY-SITE/api/health`; it should return `{"ok":true}`.
2. Open the Netlify site and sign in with the admin email and the password set in step 2.
3. Open Products, Finance, and Orders; confirm each loads.

The first request may fail if a free Render service is still waking. Check the direct Render `/api/health` URL and retry after it responds. Never put the Neon URL or `SESSION_SECRET` in Netlify's frontend environment.
