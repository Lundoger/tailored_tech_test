# Deployment

Three services: Supabase (Postgres + file storage), Railway (the API), Vercel (the web app). All
three have free tiers that cover this project.

Everything the deployment needs is already in the repository —
[`apps/api/Dockerfile`](apps/api/Dockerfile), [`railway.json`](railway.json) and
[`apps/web/vercel.json`](apps/web/vercel.json) — so the steps below are configuration, not code.

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
   - Name: `data-room-files` — must match `SUPABASE_STORAGE_BUCKET`.
   - Public bucket: **off**. The app serves everything through short-lived signed URLs; a public
     bucket would make every document readable by URL forever, bypassing shares and revocation.
   - File size limit: **50 MB or more**. The app rejects anything larger itself, but a bucket limit
     below that would fail the upload at the storage step, after the progress bar has finished.
   - Allowed MIME types (optional): `application/pdf`. Defence in depth — the API already verifies
     the stored bytes really are a PDF.
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

   **URL-encode the password** if it contains `@ : / ? #` or `&`. An unencoded `@` splits the
   connection string in the wrong place and produces a host-not-found error that looks like a
   networking problem.

5. **Project Settings → API Keys**. Copy:
   - **Project URL** → `SUPABASE_URL`
   - the **secret key** (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY`

   Not the publishable key (`sb_publishable_…`) — that one is meant for browsers and cannot write.
   The variable keeps the older name because that is what `service_role` used to be called; a secret
   key carries the same full-access rights, and `supabase-js` takes it in the same argument.

---

## 2. Railway — the API

1. <https://railway.app> → **New Project** → **Deploy from GitHub repo** → pick the repository.
2. Railway detects the workspace and offers one service per package — `@data-room/api` and
   `@data-room/web`. Before applying:
   - **Remove the `@data-room/web` service.** The web app goes to Vercel.
   - On `@data-room/api`, set **Root Directory** to the repository root, not `apps/api`. The
     Dockerfile copies the whole workspace on purpose: the API compiles against two workspace
     packages and the Prisma client has to be generated before `nest build` typechecks it. Pointed
     at `apps/api`, the build fails resolving those packages.

   With the root as its source, Railway picks up [`railway.json`](railway.json) and takes the
   builder, [`apps/api/Dockerfile`](apps/api/Dockerfile), the pre-deploy migration and the health
   check from there. The first build takes ~3 minutes.

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
   CLI. Skip this if you already ran the seed locally against the same Supabase project, which does
   the identical work:

   ```bash
   railway run node apps/api/dist/seed/seed.js
   ```

   This creates `owner@acme.test` and `viewer@acme.test`, both with password `datar00m-demo`, two
   data rooms and 29 PDFs uploaded to the Supabase bucket. Re-running it wipes and rebuilds exactly
   those two accounts and nothing else.

---

## 3. Vercel — the web app

1. <https://vercel.com/new> → import the same repository.
2. **Root Directory: `apps/web`.** Vercel reads the framework version from the package manifest in
   this directory, and `next` lives in `apps/web/package.json` — pointed at the repository root it
   fails with `No Next.js version detected`. Framework preset: **Next.js** (it may auto-detect
   `apps/api` and offer NestJS; that service is on Railway).

   [`apps/web/vercel.json`](apps/web/vercel.json) then takes over and sets the build command to
   `cd ../.. && pnpm turbo run build --filter=@data-room/web`. The detour through the repository
   root is deliberate: `@data-room/shared` is consumed as `dist/index.js`, so Turborepo has to
   compile it before Next builds. A bare `next build` inside `apps/web` cannot resolve it.

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

**The migration fails on `gin_trgm_ops`** — the trigram extension landed in a schema that is not on
the connection's `search_path`. Run this once in the Supabase SQL editor and redeploy:

```sql
create extension if not exists pg_trgm with schema public;
```

**Everything worked, then stopped days later** — Supabase pauses a free project after about a week
of inactivity, and Railway's free tier sleeps too. For a link that someone may open long after you
send it, point any uptime pinger at `https://<your-api>/health` every 10 minutes: that endpoint runs
`SELECT 1`, so it counts as database activity and keeps both awake.
