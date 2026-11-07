# Deploy Queen Mart: Netlify + Render + Neon

The frontend and backend are separate projects in this repository. Deploy from a GitHub repository; keep `.env` files out of Git.

## 1. Publish the code

Create an empty **private** GitHub repository. This local repository has no remote yet. From the project root, commit the source and push it to your new repository. Check `git status` before pushing: `.env` files and `node_modules` must not appear.

## 2. Create Neon PostgreSQL

Create a Neon project in **Frankfurt**. Copy its pooled PostgreSQL connection string, including its SSL settings. Keep the string private.

To initialize the production database from this computer:

```bash
cp mini_mart/backend/.env.example mini_mart/backend/.env
npm ci --prefix mini_mart/backend
npm run db:generate --prefix mini_mart/backend
npm run db:migrate --prefix mini_mart/backend
npm run db:admin --prefix mini_mart/backend
```

Before running the last two commands, edit `mini_mart/backend/.env`: replace `DATABASE_URL` with the Neon connection string, set `ADMIN_EMAIL`, and add a new, strong `ADMIN_PASSWORD`. Remove `ADMIN_PASSWORD` from the local file after `db:admin` succeeds. `db:migrate` creates the tables and standard categories; `db:admin` sets the one admin password. The local Docker data is **not** copied to Neon by these commands.

## 3. Deploy the Render API

Create a **Web Service** from the same GitHub repository:

| Setting | Value |
| --- | --- |
| Root directory | `mini_mart/backend` |
| Language | Node |
| Region | Frankfurt |
| Build command | `npm ci && npm run db:generate` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Set these environment variables in Render:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Neon connection string |
| `SESSION_SECRET` | A new, long random secret that stays the same across deployments |
| `HOST` | `0.0.0.0` |
| `NODE_VERSION` | `22.22.0` |

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
