# Architecture & Design Notes

The single design-rationale + operations reference for the URL shortener (Cloudflare Workers + D1 + Vue 3 SPA).
It consolidates what used to live in the per-task migration plan, the design specs, and the cutover runbook — all of
that work is **shipped and merged**, so this file keeps only the *why* and the *non-obvious operational rules* that are
not already obvious from the code. For current state / commands / invariants see [CLAUDE.md](../CLAUDE.md); for the
user-facing overview see [README.md](../README.md).

> Migration context: ported from Express + MongoDB (Vercel) to Hono + D1/Drizzle on Cloudflare Workers. The behavior
> contract of the old API was preserved almost verbatim — the **one deliberate deviation** is the API-key model (see
> Auth). Where this doc says "preserved verbatim", treat it as a hard constraint, not an accident.

---

## 1. Request routing & the apex-404 invariant

Single Worker, hostname dispatch (`api/src/index.ts`): host starting with `api.` → Hono app; otherwise
`env.ASSETS.fetch` first, and on a **404** → `handleRedirect` (short-code 302). The apex `/` falls through to the asset
404 and is never looked up as a code.

- **⚠️ The apex Worker (`blly-api`) must NOT set `assets.not_found_handling: "single-page-application"`.** SPA mode
  returns HTTP 200 for *every* path, which would shadow `/:code` redirects entirely. The apex **must 404** unmatched
  paths so `index.ts` can interpret them as short codes. (The SPA fallback belongs only on `blly-web` / `app.blly.to`.)
- Local smoke-test recipe to prove asset-vs-code precedence before deploy: with `wrangler dev` running, `register` →
  create a link → `GET /:code` expecting a 302. Hit the API via the `Host: api.blly.to` header (bare `localhost`
  never matches `api.*`).

---

## 2. Auth & accounts

### JWT (jose)
- **Why `jose`, not `hono/jwt`:** the old `jsonwebtoken` `sign({id}, secret, {expiresIn:'7d'})` auto-adds **both** `iat`
  and `exp`, and the old middleware set `req.user` to the whole payload. `hono/jwt` has no `expiresIn` and does not
  auto-add `iat`, so a naive port would drop `iat` and change the `req.user` shape. `jose` was chosen to mirror
  `jsonwebtoken` exactly → `req.user = {id, iat, exp}`, HS256, 7-day.
- **`iat` is pinned** (`setIssuedAt(iat)` + `setExpirationTime(iat + 7d)`) rather than `setExpirationTime('7d')`, because
  the two helpers capture "now" separately and can drift ~1s, making the 7-day-exact expiry test flaky. (See
  `src/lib/jwt.ts`.)

### Passwords (PBKDF2)
- Stored **self-describing**: `pbkdf2$sha256$100000$salt$hash`, so the iteration count is embedded and can be raised
  later without breaking existing hashes. 100,000 iterations; **bcrypt avoided** because of Worker CPU limits
  (comfortable on the Paid 30s-CPU plan; re-benchmark if a 10ms-CPU Free tier ever applies).
- `verifyPassword` needs an explicit `a.length !== b.length` guard **before** `crypto.subtle.timingSafeEqual`, which
  **throws** on unequal-length inputs (it does not return `false`). (See `src/lib/password.ts`.)

### API keys — the one deliberate contract deviation
- Model: **`hash + prefix + show-once`** (standard GitHub/Stripe pattern). The full key is returned ONLY on
  create/regenerate; afterwards `getApiKey` returns `{ hasKey, keyPrefix }` and the UI masks it as `ak_live_xxxxxx********`.
- This replaced the old Mongoose **sparse-unique index on the plaintext `apiKey`** with `NOT NULL UNIQUE key_hash`
  (SHA-256) + a non-secret `key_prefix`. Prefix `LIKE` search uses `idx_api_keys_prefix`.

### Google sign-in (`POST /auth/google`)
- **GIS ID-token flow**, NOT the redirect/auth-code flow: the frontend (Google Identity Services) returns an ID token;
  `lib/google.ts` verifies its signature against Google's JWKS with `jose`. Only a **public Client ID** is needed — **no
  client secret is ever stored**.
- Verify invariants (`verifyGoogleIdToken`): module-level `createRemoteJWKSet` over
  `https://www.googleapis.com/oauth2/v3/certs`; `jwtVerify` with issuer ∈ `{accounts.google.com,
  https://accounts.google.com}` and audience `=== GOOGLE_CLIENT_ID`; expiry checked; `email_verified` must be true;
  email lowercased. Any failure → `AUTH_GOOGLE_INVALID` (401).
- **Resolution order:** (1) match an existing user by `google_sub` → sign-in (200); (2) else match by email and **link**
  (set `google_sub`, fill `fullName` if empty, keep the same user id) → 200; (3) else **create** a new free/active
  Google-only account → 201. Account-status checks (inactive/suspended/pending_verification) mirror `login`.
- **Google-only account sentinel:** `password` stays `NOT NULL` and stores `''` ("no password set"). `verifyPassword('','')`
  always fails, so password-login is impossible for a Google-only account (intended). If the user later sets a password
  it becomes a normal hash.

### Turnstile-gated register & fail-closed
- `POST /auth/register` is gated by Cloudflare Turnstile (`lib/turnstile.ts` `siteverify`, needs `TURNSTILE_SECRET_KEY`)
  plus a **min-password-length** check (`< 6` → `AUTH_WEAK_PASSWORD`, 400). Turnstile failure → `AUTH_TURNSTILE_FAILED`
  (400). Self-service signups receive the default `user` role.
- **Both helpers fail closed.** `verifyTurnstile` returns `false` (never throws) on empty token / non-OK response /
  network error, and uses `CF-Connecting-IP` as `remoteip`. If `TURNSTILE_SECRET_KEY` or `GOOGLE_CLIENT_ID` is unset in
  prod, the corresponding endpoint rejects rather than letting anything through.

### Frontend signup behavior
- `SignupView.vue` injects the GIS + Turnstile scripts only on `/signup` (the apex landing is unaffected). The
  "Create account" button stays disabled until a Turnstile token exists; error/expired callbacks reset the token and
  re-render the widget. The landing "Get Started Free" CTA points to `${VITE_APP_URL}/signup`. Empty
  `VITE_GOOGLE_CLIENT_ID` hides the Google button.

---

## 3. Data model, short codes & migrations

Six D1 tables (`users, roles, user_roles, links, api_keys, redirect_logs`); schema in `src/db/schema.ts` is the source
of truth; migrations in `api/drizzle/`.

- **CHECK constraints are hand-added.** drizzle-kit does not emit enum `CHECK`s, so they were added by hand to the `0000`
  migration (`account_type`, `users.status`, `api_keys.status`) to mirror the old Mongoose enums. Keep them mirrored in
  both `schema.ts` and the migration SQL.
- **Short codes:** `nanoid(7)` must keep the **default URL-safe 64-char alphabet** (includes `-` and `_`). Two RNGs
  coexist intentionally: `crypto.randomUUID` for table PKs, `nanoid` for short codes.

### ⚠️ Migrations must stay additive on a live DB
- **`0001` (adds `users.google_sub` + unique index) is `ALTER TABLE ... ADD COLUMN` + `CREATE UNIQUE INDEX` only —
  never a table rebuild.** A drizzle-kit-generated **table rebuild** (`__new_users` / `DROP TABLE` / `CREATE TABLE`) on a
  *live* table was the root cause of the production Google sign-in **500**. If drizzle-kit ever emits a rebuild, **replace
  the generated SQL with the two additive statements** by hand. The unique index is safe without a rebuild because SQLite
  treats multiple `NULL`s as distinct under a `UNIQUE` index, so existing password-only users are unaffected.
- CI applies pending migrations to remote D1 on deploy (tracked in `d1_migrations`; already-applied ones skipped) — so
  **keep every migration expand-only / additive**.
- **FK gotcha:** D1 enforces foreign keys by default and **cannot toggle them per-query** (implicit transactions). For any
  table-rebuild migration that reorders FKs, wrap it with `PRAGMA defer_foreign_keys = on;` (resolved by migration end) to
  avoid `FOREIGN KEY constraint failed`.
- **UNIQUE-violation → errorCode mapping:** detect duplicates by matching the thrown message
  `UNIQUE constraint failed: <table>.<col>` (NOT the old Mongo `err.code === 11000`). Map `users.email` →
  `AUTH_EMAIL_EXISTS`, `links.code` → `LINK_CODE_EXISTS`, `api_keys.key_hash` → duplicate.
- **Migration workflow:** `npm run db:generate` (drizzle-kit generate, after editing `schema.ts`) then
  `wrangler d1 migrations apply` (local/remote). Do **NOT** use a `driver:'d1-http'` config / API-token push, and do not
  mix in the drizzle-kit HTTP push or studio flow — the project's migration story is generate-file + `migrations apply`.

---

## 4. Redirect, analytics & link metadata

- **Atomic click-count:** the redirect path increments via an SQL expression — `clickCount = sql\`clickCount + 1\`` inside
  `ctx.waitUntil(...)` + `db.batch(...)`, **not** read-modify-write — so concurrent redirects don't lose counts. The
  `redirect_logs` write must **never fail the redirect** (it's fire-and-forget in `waitUntil`). (See
  `src/controllers/redirectController.ts`.)
- **Geo caveat:** `request.cf` country/city are **not populated under local `wrangler dev` without `--remote`** and may be
  `undefined`. The columns are nullable; tests must not assume real geo locally.
- **`c.executionCtx.waitUntil()` throws when there is no execution context** (notably under Vitest). The non-blocking
  writes — the redirect log + click-count `db.batch`, and the api-key `last_used_at` touch — wrap the `waitUntil`
  *scheduling itself* in try/catch (not just the async task), which is why that guard code exists.
- **`fetchPageMeta` (`src/lib/meta.ts`) is an un-hardened SSRF surface.** It fetches a user-supplied destination URL
  server-side (byte cap `MAX_BYTES = 100_000`, `AbortSignal.timeout(8000)`). Divergences from the old Express version:
  dropped `rejectUnauthorized:false` (Workers `fetch` cannot disable TLS verification), replaced the manual 5-hop redirect
  loop with `redirect:'follow'`, kept the `Accept-Language` header for parity. **Blocking internal/metadata IP ranges is
  noted future hardening and is explicitly out of scope** for the migration.

---

## 5. Preserved-verbatim API quirks — these look like bugs; do NOT "fix" them

Ported byte-for-byte from the old Express API to preserve the client contract. A future contributor will be tempted to
"clean these up" — don't, without checking the consumers.

- `POST /roles` with a missing `name` returns **`ROLE_NAME_EXISTS` (400)**, not a generic validation error.
- `GET /auth/api-key` returns the **newest** key with **no `is_personal` filter** — do **not** add `WHERE is_personal = 1`.
- On the JWT path, `req.user` carries **only `id`** (no `email`/`fullName`); controllers rely on `req.user.id` only.
- Ad-hoc api-key error bodies are `{ success:false, message }` with **no `errorCode` field** — must stay byte-for-byte
  (this is the documented exception to the otherwise-flat `{ success, errorCode, message }` envelope).
- `deleteLinkByCode` is **intentionally dead / unported** code.
- `DELETE /links/:id` disambiguates id-vs-code via a **UUID-shape check** (the old code used a 24-hex ObjectId regex).
- **Two different device-parsing paths, intentionally NOT unified:** the api-key stats path (`getKeyStats` in
  `apiKeyController.ts`) buckets user-agents into `Mobile`/`Desktop`/`Unknown` via a UA regex, while the link-analytics
  path uses `parseDevice` (`'Browser / OS'` strings). Each reproduces the corresponding old endpoint exactly — do not
  merge them into one device parser.

---

## 6. RBAC (client-side by design)

- **The API enforces no permissions.** `checkPermission` middleware exists but is wired into no route; users/roles/
  api-keys are auth-only admin surfaces. Permissions drive **Vue menu gating only**.
- **Seed admin RBAC matrix:** the seeded admin role grants the full frontend matrix across exactly **seven menus**
  (`dashboard, urls, users, docs, api_key, api_keys, roles`) × **three actions** (`view, edit, delete`). `seedAdmin`
  (`src/seed.ts`) is **idempotent** (safe to re-run).
- Do not add server-side permission gating without re-reading the design intent (it was a deliberate decision, not an
  oversight).

---

## 7. Testing

- `npm test` (in `api/`) runs Vitest with `@cloudflare/vitest-pool-workers` on local Miniflare D1 — **93 tests / 21
  files**, no network. `nodejs_compat` lives ONLY in `vitest.config.ts`, never in production `wrangler.jsonc`.
- **Migrations are applied per-test-file** by `test/apply-migrations.ts` (`applyD1Migrations(env.DB, TEST_MIGRATIONS)`);
  the pool does NOT auto-apply them, and migration SQL must be generated before route tests run.
- `singleWorker: true`; `isolatedStorage` is the **default (`true`)** → each `it` rolls back to the `beforeAll` snapshot.
  If a test needs pre-existing rows, **seed them in `beforeAll`**. Do **NOT** flip `isolatedStorage` or edit
  `vitest.config.ts` to work around isolation — that previously corrupted the suite.
- **Offline mocking of outbound auth fetches:** `siteverify` and the Google JWKS endpoint are outbound `fetch`es, so
  tests must mock them with `fetchMock` from `cloudflare:test`. The JWKS path is tested by generating an RSA keypair with
  `jose.generateKeyPair`, mocking the JWKS endpoint with the public JWK, and signing a test ID token with the private key
  so `jwtVerify` passes.
- **Turnstile always-pass test keys** (Cloudflare's canonical pair, used in `api/.dev.vars` + `web/.env` for local dev):
  - site key: `1x00000000000000000000AA`
  - secret: `1x0000000000000000000000000000000AA`
- No frontend test framework — verify `web/` changes by building + the local dev flow.

---

## 8. Operations

### Config & secrets
- **Runtime values set once via `wrangler secret put`** (CI sets none of these): `JWT_SECRET`, `TURNSTILE_SECRET_KEY`,
  and `GOOGLE_CLIENT_ID`. `wrangler.jsonc` `vars` currently holds only `BASE_SHORT_URL`.
- **Only `JWT_SECRET` + `TURNSTILE_SECRET_KEY` are genuinely sensitive.** `GOOGLE_CLIENT_ID` is **public by nature** —
  the frontend ships it as `VITE_GOOGLE_CLIENT_ID` — so it is not a true secret; this deployment just supplies it via
  `wrangler secret put` for convenience. It could equally live in `wrangler.jsonc` `vars`.
- **Google Cloud setup (one-time, user action):** create an OAuth **Web** client with Authorized JavaScript origins
  `https://app.blly.to` + `http://localhost:5173`. A real Google OAuth Client ID is required to exercise Google
  sign-in — there is no universal test client.

### First-time admin seed (fresh / cloned account)
There is **no committed seed endpoint** by design. To bootstrap the first admin on a fresh or cloned account:
1. Temporarily add a token-gated `POST /api/v1/_seed` route to `src/app.ts`, plus a `SEED_TOKEN: string` field on `Env`.
   The handler checks the `x-seed-token` header against `env.SEED_TOKEN`, then calls the idempotent
   `seedAdmin(c.env, { email, password })`.
2. `wrangler secret put SEED_TOKEN`, then deploy.
3. `curl` the route once (with the `x-seed-token` header) to create the admin. `seedAdmin` is idempotent — safe to re-run.
4. **Remove the route + the `SEED_TOKEN` field and redeploy.** Never commit the `_seed` route.

### Cloning to a new Cloudflare account
1. `wrangler d1 create blly-db`, then replace the `database_id` in `api/wrangler.jsonc`.
2. Set `JWT_SECRET`, `TURNSTILE_SECRET_KEY`, and `GOOGLE_CLIENT_ID` via `wrangler secret put` (CI sets none of them).
3. Run the first-time admin-seed bootstrap above.
4. Update domain-bound config (CORS origin in `src/app.ts`, both `wrangler.jsonc` routes, `web/.env.production`) if the
   zone differs from `blly.to`.

### Decommissioning the legacy stack (Express/Mongo)
Do this **only after traffic is confirmed on D1**: point the frontend at the new API base, retire the Vercel/Express API
project (the legacy `vercel.json` + Express tree are already removed), then tear down the MongoDB Atlas cluster.

---

## 9. Scale limits & future roadmap

- **D1 free-tier limits:** 500 MB DB / 1 MB per row. `redirect_logs` is the growth driver — revisit storage before scale.
- **Designed-for but out of scope** (intentionally deferred):
  - **KV redirect cache** (`code → { destinationUrl, isActive, expiresAt }`) for sub-10ms lookups; the redirect path
    could be split into its own Worker.
  - **Analytics Engine** to replace per-redirect `redirect_logs` inserts.
  - **Durable Object** per-link counter for strongly-consistent click counts.
  - Wiring `checkPermission` for real **server-side RBAC** (currently client-side only).
