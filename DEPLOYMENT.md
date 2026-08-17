# Deployment

Three services: Supabase (Postgres + file storage), Railway (the API), Vercel (the web app). All
three have free tiers that cover this project.

Everything the deployment needs is already in the repository —
[`apps/api/Dockerfile`](apps/api/Dockerfile), [`railway.json`](railway.json) and
[`vercel.json`](vercel.json) — so the steps below are configuration, not code.

Work through them in order: Railway needs the database to exist, and Vercel needs the API's URL.

---

## 0. Push the repository to GitHub

Railway and Vercel both deploy from a Git remote.

```bash
git init
git add -A
git commit -m "Data Room MVP"
gh repo create <your-name>/data-room --private --source=. --push
```

Check before pushing that `git status` shows no `.env` and no `apps/api/.storage/` — both are
ignored, but it is worth one glance, since one of them holds credentials.

---

## 1. Supabase — database and file storage

1. <https://supabase.com/dashboard> → **New project**. Pick a region near you and set a database
   password — **copy it now**, the dashboard will not show it again.
2. Wait for provisioning (~2 minutes).
3. **Storage** → **New bucket**:
   - Name: `data-room-files`
   - Public bucket: **off**. The app serves everything through short-lived signed URLs; a public
     bucket would make every document readable by URL forever.
   - Create.
   - No access policies are needed. The API authenticates with the service-role key, which bypasses
     row level security, and it is the only thing that ever talks to storage.
4. **Project Settings → Database → Connection string → Session pooler**. Copy it and substitute
   your password for `[YOUR-PASSWORD]`. It looks like:

   ```
   postgresql://postgres.abcdefghijklm:YOUR-PASSWORD@aws-0-eu-west-2.pooler.supabase.com:5432/postgres
   ```

   Use the **session** pooler, not the transaction pooler on port 6543. Session mode keeps one
   backend per connection, which is what `prisma migrate deploy` needs for its advisory lock, and it
   is reachable over IPv4 — the direct connection is IPv6-only, which not every host can reach.

5. **Project Settings → API**. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY` (not the `anon` key — that one cannot
     write, and it is meant for browsers)

---

## 2. Railway — the API

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo** → pick the repository.
2. Railway reads [`railway.json`](railway.json) and builds with
   [`apps/api/Dockerfile`](apps/api/Dockerfile). The first build takes ~3 minutes.
3. **Variables** → add:

   | Variable                    | Value                                                           |
   | --------------------------- | --------------------------------------------------------------- |
   | `DATABASE_URL`              | the session-pooler string from step 1.4                         |
   | `DIRECT_URL`                | the same string — migrations run through the session pooler too |
   | `JWT_SECRET`                | 48 random bytes: `openssl rand -base64 48`                      |
   | `SUPABASE_URL`              | from step 1.5                                                   |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1.5                                                   |
   | `SUPABASE_STORAGE_BUCKET`   | `data-room-files`                                               |
   | `NODE_ENV`                  | `production`                                                    |
   | `WEB_ORIGIN`                | the Vercel URL — come back and fill this in after step 3        |

   `PORT` is injected by Railway. Leave `STORAGE_DRIVER` unset: the app switches to Supabase on its
   own once the two Supabase variables are present, and logs which driver it chose at startup.

4. **Settings → Networking → Generate Domain**. Copy the result, e.g.
   `https://data-room-api-production.up.railway.app`.
5. The migration runs automatically: `railway.json` sets `prisma migrate deploy` as the pre-deploy
   command, so the schema is created on first deploy and kept current on every later one.
6. Check it is alive:

   ```bash
   curl https://<your-api>.up.railway.app/health
   # {"status":"ok","database":"up"}
   ```

   That endpoint queries Postgres, so an `ok` means the database connection works, not just that the
   process started. Swagger is at `/docs`.

7. Seed the demo content — once, from the Railway shell (**Deployments → ⋯ → Shell**) or with the
   CLI:

   ```bash
   railway run node apps/api/dist/seed/seed.js
   ```

   This creates `owner@acme.test` and `viewer@acme.test`, both with password `datar00m-demo`, two
   data rooms and 29 PDFs uploaded to the Supabase bucket. Re-running it wipes and rebuilds exactly
   those two accounts and nothing else.

---

## 3. Vercel — the web app

1. <https://vercel.com/new> → import the same repository.
2. **Root Directory: leave it as the repository root.** Not `apps/web` — the build goes through
   Turborepo so the shared package is built first, and [`vercel.json`](vercel.json) already
   specifies the build, install and output paths.
3. **Environment Variables** → add one:

   | Variable     | Value                                                 |
   | ------------ | ----------------------------------------------------- |
   | `API_ORIGIN` | the Railway URL from step 2.4, with no trailing slash |

   Deliberately not `NEXT_PUBLIC_`: it is only read by the rewrite in `next.config.ts`, which runs on
   the server. The browser never needs the API's address, because it only ever calls `/api/*` on its
   own origin.

4. **Deploy.**
5. Go back to Railway and set `WEB_ORIGIN` to the Vercel URL. In normal use CORS never applies — the
   browser talks to Vercel, which proxies to Railway — but this makes a direct call from the
   deployed frontend work too, and it costs one variable.

---

## 4. Check it end to end

On the deployed site:

1. Sign in as `owner@acme.test` / `datar00m-demo` → **Project Atlas** with 29 documents.
2. Open any PDF. It should render inline. In the browser's network tab the document URL points at
   `supabase.co` — proof the bytes are not travelling through the API.
3. Upload a PDF by dragging it onto the page. The progress bar should move; that request goes
   straight to `supabase.co` too.
4. Upload the same file again → the conflict dialog offers "new version" or "keep both".
5. Share a folder as a public link, open it in a private window → read-only viewer, no sign-in.
6. Share the data room with `viewer@acme.test`, open the link in a private window → it asks you to
   sign in as that address. Sign in there and it opens.
7. Revoke it from the owner's session and reload the recipient's tab → "Access has been turned off".
8. In the browser's application tab, confirm the session cookie is set on the **Vercel** domain and
   marked `HttpOnly` — that is the whole point of the proxy.

Then put both URLs at the top of [`README.md`](README.md), where two placeholders are waiting.

---

## Troubleshooting

**Railway build fails at `pnpm install`** — check that Railway is building from the repository root.
The Dockerfile expects the whole workspace as its context because the API depends on two workspace
packages.

**`/health` returns 503, or the deploy loops** — the database URL is wrong or unreachable. Confirm
you used the **session pooler** string and that the password is filled in. Railway's deploy log
prints the Prisma error verbatim.

**Uploads fail with 400 from `supabase.co`** — the bucket name does not match
`SUPABASE_STORAGE_BUCKET`, or the bucket was not created. It must be exactly `data-room-files`
unless you changed the variable.

**Signed in, but every request comes back 401** — `API_ORIGIN` has a trailing slash, which makes the
rewrite produce `//auth/me`. Remove it and redeploy.

**Documents open as a download instead of rendering** — that is the browser's PDF setting, not the
app. The viewer detects it and offers "Open in a new tab".
