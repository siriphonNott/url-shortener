# CLAUDE.md

URL shortener, **migrated from Express/MongoDB (Vercel) → Cloudflare Workers + D1**. Monorepo:
`api/` (Hono Worker on D1 via Drizzle) and `web/` (Vue 3 SPA: landing + management app).
Currently **live on the `blly.to` zone** (the production brand domain; previously ran on `eraflow.dev`).

## Current state (resume here)

- **Trunk is `main`.** The migration (PR #1, `migrate-to-cloudflare-d1`) is **merged** and **deployed from `main`**.
- **Working flow (always):** start EVERY piece of implementation work in a **git worktree** — never edit in the
  main checkout (use the `superpowers:using-git-worktrees` skill / `EnterWorktree`). Pure questions/reads need no worktree.
- **No PRs.** Land finished work by merging the branch into `main` locally; direct push to `main` is harness-blocked
  (see Gotchas), so the **user pushes** `main`. On push to `main`, **GitHub Actions auto-deploys** api + web (see CI/CD).
- **Changelog + version (every landed change):** BEFORE handing work off for `main`, add a summary entry to
  `CHANGELOG.md` and bump the **root `package.json`** version. Semver by change type: `patch` = fix/chore/docs,
  `minor` = new feature, `major` = breaking. The version anchors to root `package.json`; `api/`+`web/` versions stay
  independent. CHANGELOG follows Keep a Changelog (newest entry on top, `## [x.y.z] - YYYY-MM-DD`).
- **Backend:** complete, **93/93 tests passing** (21 test files), incl. email/password + Google + Turnstile signup.
- **Deployed (Cloudflare account `siriphonnot@gmail.com`):**
  - `https://api.blly.to` — API (Worker `blly-api`)
  - `https://blly.to` — landing + short-link redirects (same Worker `blly-api`, static assets)
  - `https://app.blly.to` — management SPA (Worker `blly-web`, static assets + SPA fallback)
- **Workflow the user wants:** test locally → confirm → **then** deploy. Do NOT deploy without confirmation.

## Layout

```
api/                 Cloudflare Worker (Hono + D1/Drizzle)
  src/index.ts       Worker entry — hostname routing (api.* → Hono; apex → assets/redirect)
  src/app.ts         Hono app: CORS, route mounts, /api/v1/health, app.onError
  src/controllers/   auth, link, user, role, apiKey, redirect
  src/routes/        auth, links, users, roles, apiKeys
  src/middleware/    auth (JWT + x-api-key), checkPermission (ported, NOT wired — RBAC is client-side)
  src/lib/           errorCodes (ok/fail), password (PBKDF2), jwt (jose), keys (SHA-256 hash+prefix),
                     google (Google ID-token verify), turnstile (siteverify), errorPage (broken-link HTML), meta, geo, time
  src/serializers/   wire shapes (_id vs id, camelCase, parsed JSON)
  src/db/            schema.ts (6 tables, Drizzle), client.ts ; drizzle/ = migrations
  src/seed.ts        idempotent admin seed (seedAdmin + ADMIN_PERMISSIONS)
  public/            served at the apex — GENERATED copy of web/dist (the landing). Do not hand-edit.
  test/              vitest + @cloudflare/vitest-pool-workers (local Miniflare D1)
web/                 Vue 3 SPA (Vite, vue-router history mode, pinia, vue-i18n, Tailwind)
  src/views/LandingView.vue   public landing (/) ; login/CTA → VITE_APP_URL
  src/stores/auth.js          token + user + permissions + api-key state
  src/api/index.js            axios (baseURL = VITE_API_URL); 401 → clear token → /login
docs/ARCHITECTURE.md design rationale, preserved-verbatim API quirks, ops (seed/clone/decommission), test patterns
```

## Commands

```bash
# API (run from api/)
npm test                       # vitest run — 93 tests / 21 files, local Miniflare D1 (no network)
npm run dev                    # wrangler dev → http://localhost:8787 (port pinned in wrangler.jsonc)
npm run db:generate            # drizzle-kit generate (after editing src/db/schema.ts)
npm run db:migrate:local       # apply migrations to local D1 (no auth)
npm run db:migrate:remote      # apply migrations to remote D1 (needs CF token)
npm run deploy                 # wrangler deploy (needs CF token)

# Web (run from web/)
npm run dev                    # vite → http://localhost:5173 (proxies /api/v1 → :8787, see Local dev)
npm run build                  # vite build → web/dist (uses .env.production)
```

## Architecture

- **Single Worker, hostname dispatch** (`api/src/index.ts`): host starts with `api.` → `app.fetch` (Hono API);
  otherwise `env.ASSETS.fetch` first, and on **404** → `handleRedirect` (short-code 302). `/` (apex root) falls
  through to the asset 404 — never looked up as a code.
- **D1 + Drizzle** — 6 tables (`users, roles, user_roles, links, api_keys, redirect_logs`), migrations in `drizzle/`
  (`0000` baseline; `0001` adds `users.google_sub` + unique index for Google sign-in). Schema is the source of truth;
  CHECK constraints on enum columns are mirrored in both `schema.ts` and the migration SQL. CI applies pending
  migrations to remote D1 on deploy — **keep every migration additive/expand-only; never rebuild a live table** (a
  drizzle-kit `__new_users` rebuild on the live `users` table caused the prod Google sign-in 500; see `ARCHITECTURE.md` §3).
- **Two deployed Workers:** `blly-api` (API + apex landing/redirect) and `blly-web` (SPA, `not_found_handling:
  single-page-application`). Both use `custom_domain: true` routes (wrangler auto-provisions DNS + edge TLS).
- **Frontend split:** the apex (`blly.to`) cannot use SPA fallback (it would shadow `/{code}`), so it serves the
  landing only and the landing's Login/CTA links point to `VITE_APP_URL` (`app.blly.to`), where the full SPA runs.
  ⚠️ **Never set `assets.not_found_handling: single-page-application` on the apex Worker** — SPA mode 200s every path and
  shadows `/:code` redirects; the apex MUST 404 unmatched paths so `index.ts` treats them as codes (see `ARCHITECTURE.md` §1).

## Invariants — do NOT break these

- **Error envelope is FLAT:** `{ success:false, errorCode, message }` (top-level, not nested). Success: `{ success:true, ...data }`.
  Built by `ok()`/`fail()` in `lib/errorCodes.ts`. Exception: api-keys ad-hoc errors `{ success:false, message }` (no code) — intentional.
- **Wire field names are camelCase.** PK is **`_id`** for link/role/log objects, **`id`** for user/api-key objects (see serializers).
- **ESM only, no Node built-ins** (`http`/`fs`/`Buffer`/`crypto.randomBytes`). WebCrypto + `fetch` only. **No `nodejs_compat`
  in production `wrangler.jsonc`** — it lives ONLY in `vitest.config.ts` (test pool).
- **Auth:** JWT HS256 `{id,iat,exp}` 7-day (jose); passwords PBKDF2 (`lib/password.ts`); API keys stored as SHA-256
  `key_hash` + `key_prefix`. **Show-once:** the full key is returned ONLY on create/regenerate, never retrievable after
  (`getApiKey` returns `{ hasKey, keyPrefix }`; the UI masks it as `ak_live_xxxxxx********`).
- **Sign-up paths:** email/password `POST /auth/register` is gated by Cloudflare Turnstile (`lib/turnstile.ts`
  siteverify, needs `TURNSTILE_SECRET_KEY`) + a min-password-length check; Google sign-in is `POST /auth/google`
  (verifies the Google ID token in `lib/google.ts`, needs `GOOGLE_CLIENT_ID`) and matches/links/creates a user via
  `users.google_sub`. Both **fail closed** if their secret is unset. Self-service signups get the default `user` role.
- **Link ownership:** every link-by-id path (get/update/delete/logs/analytics) filters by `createdBy` → cross-user = `LINK_NOT_FOUND`.
- **RBAC is client-side by design** (spec §8). `checkPermission` exists but is wired into no route; users/roles/api-keys are
  intentional auth-only admin surfaces. Do NOT add server-side permission gating without checking the spec.

## Local development

The Worker routes by **hostname**, and bare `localhost` never matches `api.*`, so the web dev proxy rewrites the Host header.

- `api/.dev.vars` (gitignored): `JWT_SECRET` + `BASE_SHORT_URL=http://localhost:8787` for `wrangler dev`.
- `web/.env` (gitignored): `VITE_API_URL=/api/v1` (relative → proxied), `VITE_BASE_SHORT_URL=http://localhost:8787`.
- `web/vite.config.js`: proxies `/api/v1` → `localhost:8787` with `Host: api.blly.to` so the Worker routes to the API.
- `api/wrangler.jsonc` pins `dev.port: 8787` so the proxy target is deterministic.

Run: `cd api && npm run dev` (terminal 1) and `cd web && npm run dev` (terminal 2), then open `http://localhost:5173`.
Local D1 is fully local (Miniflare) — migrate with `npm run db:migrate:local`. A local admin is seeded:
**`local@test.dev` / `localpw123`** (local-only throwaway), or register a new account.

## Deployment (blly.to)

**CI/CD (primary):** `.github/workflows/deploy.yml` runs on **push to `main`** — runs the api test suite, then (on
green) builds web → deploys the SPA (`app.blly.to`) → refreshes the apex landing in `api/public` → deploys the api
Worker (`api.blly.to` + `blly.to`). Needs GitHub repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
The Worker also needs **runtime secrets set once** via `wrangler secret put` (CI does NOT set these): `JWT_SECRET` (set),
plus `TURNSTILE_SECRET_KEY` and `GOOGLE_CLIENT_ID` — the latter two back signup/Google sign-in server-side; if missing in
prod those endpoints fail even though the frontend has the public `VITE_*` keys.

**Manual deploy (fallback)** requires a CF API token with **Account: D1 Edit + Workers Scripts Edit + Account Settings
Read; Zone(blly.to): Workers Routes Edit + DNS Edit + Zone Read** (the "Edit Cloudflare Workers" template + D1 +
DNS). Pass via `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` env (never commit it). First-time admin seed, cloning to a
new CF account, and legacy decommission are in `docs/ARCHITECTURE.md` §8 (Operations).

- **Backend:** `cd api && npm run deploy` (D1 already created: `blly-db`, id in `wrangler.jsonc`; secret `JWT_SECRET` set remotely).
- **Frontend — rebuild and deploy BOTH or the apex landing goes stale:**
  ```bash
  cd web && npm run build && npx wrangler deploy          # → app.blly.to
  rm -rf ../api/public/* && cp -r dist/. ../api/public/    # refresh apex landing
  cd ../api && npx wrangler deploy                          # → blly.to + api.blly.to
  ```
- **Moving to another domain later:** add the new zone to the CF account, then update `web/.env.production`, both
  `wrangler.jsonc` routes, the API CORS origin (`src/app.ts`), the local-dev `Host` header (`web/vite.config.js`), the
  Turnstile widget's allowed domains, and the Google OAuth client's authorized JavaScript origins; then rebuild+redeploy
  both. (This is exactly how the `eraflow.dev → blly.to` cutover was done — see CHANGELOG `1.4.0`.)

## Testing

- `npm test` in `api/` runs vitest with `@cloudflare/vitest-pool-workers` (real D1 migrations applied via
  `test/apply-migrations.ts`). `singleWorker: true`; `isolatedStorage` is the DEFAULT (`true`) → each `it` rolls back to
  the `beforeAll` snapshot.
- **If a test needs pre-existing rows, seed them in `beforeAll`.** Do **NOT** flip `isolatedStorage`, change
  `vitest.config.ts`, or edit other tasks' tests to work around isolation — that previously corrupted the suite. If
  tempted, stop and reconsider the test design.
- No frontend test framework — verify `web/` changes by building + the local dev flow above.

## Gotchas

- **Pushing:** direct push to `main` is harness-blocked — work in a worktree branch, merge into `main` locally, and let
  the **user push** `main` (which triggers the CI deploy). SSH auths as `siriphonNott` via `~/.ssh/me` (needs
  `IdentitiesOnly yes` for github.com). **No PRs** — see Working flow in Current state.
- **`gh` CLI:** the active account defaults to `developerf03`; switch with `gh auth switch --hostname github.com --user
  siriphonNott` if you need `gh` (e.g. setting repo secrets), then switch back.
- **Local DNS cache:** a sandbox may fail to resolve `*.blly.to` (stale NXDOMAIN) right after deploy; test with
  `curl --resolve host:443:104.21.67.192 ...`. Public DNS (and real browsers) resolve fine.
- `database_id` in `wrangler.jsonc` is the real `blly-db` id; if cloning to a new account, recreate D1 and replace it.
- `api/.wrangler/` (local D1 state) is gitignored — never commit it.

## Reference

- **`docs/ARCHITECTURE.md`** — the single design-rationale + operations reference: why-decisions (jose vs hono/jwt,
  PBKDF2, API-key contract, Google GIS flow), preserved-verbatim API quirks (do NOT "fix"), migration foot-guns
  (additive-only, FK PRAGMA, UNIQUE→errorCode), admin-seed bootstrap, clone-to-new-account, legacy decommission, test
  patterns (offline fetchMock, Turnstile test keys), and scale limits / future roadmap.
  (Consolidated from the former per-task migration plan, design specs, and cutover runbook — all shipped and removed.)
