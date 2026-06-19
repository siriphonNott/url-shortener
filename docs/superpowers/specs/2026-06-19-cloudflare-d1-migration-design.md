# Migrating url-shortener from MongoDB Atlas to Cloudflare (D1 + Workers)

- **Date:** 2026-06-19
- **Status:** Approved design — revised after adversarial review + domain/API-key decisions (pending final spec review)
- **Scope of this spec:** the **backend** (API → Hono/Workers, DB → D1) plus the Worker serving the **landing page** as static assets and the **redirect** on the apex. Building the Vue app and deploying the **management app** to Pages is a **separate sub-project** (see §15).

## 1. Context

`blly.to` URL shortener, two parts:

- **`api/`** — Express (CommonJS) on Vercel, MongoDB Atlas via Mongoose. Features: JWT + API-key auth, RBAC (roles + permissions), link CRUD + shortening, redirect with click logging, per-user analytics, API-key management.
- **`web/`** — Vue 3 + Vite SPA on Vercel. It is a **live consumer of the exact current API JSON shapes** (it reads `_id`, camelCase fields, nested role objects). Preserving those shapes is the binding constraint of this migration.

This spec migrates the database and API runtime to Cloudflare.

## 2. Goals / Non-goals

**Goals**

- Replace MongoDB Atlas with **Cloudflare D1** (serverless SQLite).
- Port the Express API to **Hono on Cloudflare Workers** (TypeScript + ESM).
- Access D1 via **Drizzle ORM** (schema-as-code; camelCase JS fields mapped to snake_case columns).
- **Preserve the existing API contract** — paths, JSON envelopes, field names (incl. `_id` and camelCase), and error bodies — **except one deliberate, approved change: API-key storage moves to hash + prefix + show-once** (§7.3). All other shapes stay identical so the management-app frontend changes only its two base-URL env vars plus the API-key UI (§15).

**Non-goals (this round)**

- No data migration — **greenfield**; seed an admin user + roles.
- No KV cache, Analytics Engine, or Durable Objects (MVP = D1 only; designed to layer in later, §13).
- No new product features. No backend-side change to RBAC enforcement (see §6.2).
- **Building the Vue app + deploying the management app to Pages is out of scope here** — separate sub-project (§15). This spec's Worker *does* serve the landing-page build as static assets (§4.2).

## 3. Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| API runtime | Express/Vercel → **Hono / Cloudflare Workers**, TypeScript + ESM |
| Database | MongoDB Atlas → **D1 (SQLite)** |
| Data access | **Drizzle ORM** (+ `drizzle-kit generate` → `wrangler d1 migrations apply`) |
| Topology | **One Worker** owns `api.blly.to/*` (API) **and** `blly.to/*` (landing static assets + `/:code` redirect) |
| Data migration | **Greenfield** — seed admin + roles |
| Redirect path | **D1 only (MVP)**, in the Worker, coexisting with the landing static assets on the apex |
| API keys | **Hash (SHA-256) + non-secret prefix + show-once** (replaces plaintext) — deliberate contract change (§7.3) |
| Management app | Vue → Cloudflare Pages on `app.blly.to` — **separate sub-project** (§15) |

### 3.1 Domain map

| Surface | Domain | Served by |
|---|---|---|
| API | `api.blly.to/api/v1/*` | this Worker |
| Redirect | `blly.to/:code` | this Worker (D1 lookup → 302) |
| Landing page | `blly.to/` | this Worker (Static Assets) |
| Management app | `app.blly.to` | Cloudflare Pages (sub-project §15) |

## 4. Architecture

### 4.1 Repo layout

```
url-shortener/
├── api/                         # Cloudflare Worker (Hono + Drizzle + D1)
│   ├── src/
│   │   ├── index.ts             # Hono app, hostname routing, error handler, CORS
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle tables (camelCase fields → snake_case columns)
│   │   │   └── client.ts        # drizzle(env.DB)
│   │   ├── serializers/         # row → exact legacy JSON shape (_id, camelCase, nested)
│   │   ├── routes/              # auth, links, users, roles, apiKeys, shorten, redirect
│   │   ├── controllers/         # ported 1:1 (behavior-preserving)
│   │   ├── middleware/          # auth (JWT + x-api-key), checkPermission
│   │   └── lib/
│   │       ├── errorCodes.ts    # ERRORS map verbatim; ok()/fail() re-signatured for Hono
│   │       ├── password.ts      # WebCrypto PBKDF2 hash/verify
│   │       ├── jwt.ts           # sign/verify (jose) — explicit iat/exp
│   │       ├── keys.ts          # API-key gen + SHA-256 hash + prefix (WebCrypto)
│   │       └── meta.ts          # fetch()-based URL metadata (replaces Node http/https)
│   ├── public/                  # landing-page build output (Static Assets) — produced by §15
│   ├── drizzle/                 # generated migration SQL
│   ├── drizzle.config.ts
│   ├── wrangler.jsonc           # D1 binding, assets binding, routes (api + apex), secrets/vars
│   └── package.json
└── web/                         # (separate sub-project) Vue: landing build feeds api/public; app → Pages
```

### 4.2 One Worker: hostname routing + Static Assets on the apex

One Worker (routes `api.blly.to/*` + `blly.to/*`) with a **Workers Static Assets** binding pointing at the landing build (`api/public`). Dispatch:

- **`api.blly.to`** → Hono `/api/v1/*` (CORS → auth → controller → Drizzle → D1).
- **`blly.to`**:
  - request matches a **static asset** (`/`, `/assets/*`, `/favicon.ico`, …) → served directly from the assets binding (the landing SPA). `index.html` serves `/`.
  - otherwise (e.g. `/:code`) → the **Worker runs as the fallback** → D1 lookup → 302 redirect; unknown code → 404 (or the landing 404).

> **Asset-vs-code precedence (gotcha):** configure assets so the **Worker is invoked for non-asset paths** — i.e. do **not** use `not_found_handling: "single-page-application"` on the apex (it would serve `index.html` for `/:code` and the redirect would never run). The landing is effectively a single route (`/`) plus static files, so SPA-fallback is unnecessary here. The management app's client-side routes live on `app.blly.to` (Pages), not the apex.

> **Topology change to flag:** today redirect + API + landing are **co-hosted on one origin** — `web/.env` sets `VITE_API_URL=http://localhost:3000/api/v1` and `VITE_BASE_SHORT_URL=http://localhost:3000` (same origin); `app.js` mounts redirect at `app.use('/', …)`. After migration: `VITE_API_URL`→`https://api.blly.to/api/v1`, `VITE_BASE_SHORT_URL`→`https://blly.to`, and `createLink`'s `shortUrl` (`${BASE_SHORT_URL}/${code}`) is built from the **apex** var.

### 4.3 Request flow

```
Client ─> Worker (routes: api.blly.to/*, blly.to/*)
            ├─ host = api.blly.to ─> CORS ─> /api/v1/* ─> auth ─> controller ─> Drizzle ─> D1
            └─ host = blly.to
                 ├─ path matches a static asset ─> Static Assets (landing SPA)
                 └─ else (/:code) ─> redirect handler ─> D1 lookup ─> 302
                          └─ executionCtx.waitUntil(try { db.batch([UPDATE count, INSERT log]) } catch {})
```

## 5. D1 Schema

SQLite specifics: `TEXT` UUID ids (`crypto.randomUUID()`), booleans as `INTEGER` 0/1, timestamps as ISO-8601 `TEXT`, JSON blobs as `TEXT`. **Drizzle field names are camelCase mapped to snake_case columns** (e.g. `destinationUrl: text('destination_url')`) so query results already carry camelCase keys (see §6). D1 **enforces foreign keys by default** (no per-query PRAGMA needed). Migrations: `drizzle-kit generate` → `wrangler d1 migrations apply --local|--remote`.

```sql
-- users  (User model)
CREATE TABLE users (
  id            TEXT PRIMARY KEY,                  -- crypto.randomUUID()
  email         TEXT NOT NULL UNIQUE,              -- lowercased
  password      TEXT NOT NULL,                     -- PBKDF2 string (params+salt+hash)
  full_name     TEXT NOT NULL DEFAULT '',
  account_type  TEXT NOT NULL DEFAULT 'free'
                CHECK (account_type IN ('free','premium','enterprise')),   -- matches Mongoose enum
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','suspended','pending_verification')), -- matches Mongoose enum
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- roles  (Role model)
CREATE TABLE roles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  permissions  TEXT NOT NULL DEFAULT '{}',         -- JSON: { [menu]: { view|edit|delete: bool } }
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- user_roles  (replaces User.roles[] — many-to-many)
CREATE TABLE user_roles (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id  TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- links  (Link model)  — title/description nullable, NO default (matches Mongoose)
CREATE TABLE links (
  id               TEXT PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  destination_url  TEXT NOT NULL,
  title            TEXT,                            -- nullable; insert of undefined → NULL
  description      TEXT,                            -- nullable
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  click_count      INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,      -- 0/1
  expires_at       TEXT,                            -- ISO-8601 or NULL
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_links_created_by ON links(created_by);
CREATE INDEX idx_links_created_at ON links(created_at);

-- api_keys  (ApiKey model)  — hash + prefix + show-once (see §7.3)
CREATE TABLE api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_name     TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,                -- SHA-256 hex of the full key (auth lookup)
  key_prefix   TEXT NOT NULL,                       -- non-secret display/search token, e.g. "ak_live_a1b2c3"
  scopes       TEXT NOT NULL DEFAULT '{"links":"read","stats":"read"}',  -- JSON
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive','expired','revoked')),
  expires_at   TEXT,
  last_used_at TEXT,
  is_personal  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);  -- prefix search/display

-- redirect_logs  (RedirectLog model; field "link" → link_id)  — adds country + city
CREATE TABLE redirect_logs (
  id          TEXT PRIMARY KEY,
  link_id     TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,  -- Mongoose field name was "link"
  ip          TEXT,
  user_agent  TEXT,
  referer     TEXT,                                 -- NULL when absent (not '')
  country     TEXT,                                 -- request.cf.country (ISO-2) at write time
  city        TEXT,                                 -- request.cf.city at write time
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_redirect_logs_link ON redirect_logs(link_id);
CREATE INDEX idx_redirect_logs_created_at ON redirect_logs(created_at);
```

**Constraint provenance (deliberate vs. inherited):**
- `account_type` / `status` CHECKs mirror the Mongoose `enum` sets exactly (verified) — no tightening.
- Mongoose `ApiKey` had a `sparse` unique index on the plaintext `apiKey`; that column is **replaced** by `key_hash` (SHA-256, always set → `NOT NULL UNIQUE`) plus a non-secret `key_prefix` (§7.3). This is the one deliberate schema/contract change.
- `links.title`/`description` stay nullable with no default to match Mongoose; `createLink` inserting `undefined` must yield `NULL`, and the create response omits absent title/description (§9).

## 6. Response contract & serialization (binding constraint)

The current controllers return **raw Mongoose documents** in several places, so the wire shapes are NOT uniform. The frontend depends on these exact shapes. A dedicated `serializers/` layer maps DB rows → legacy JSON; **Drizzle returning camelCase keys is necessary but not sufficient** (the `_id` field and nested shapes must be added).

### 6.1 `_id` vs `id` (critical)

| Endpoint group | Current PK field on the wire | Why |
|---|---|---|
| links (`getLinks`, `updateLink`, `getLinkByCode`, `getLinkAnalytics.link`), roles (`getRoles/createRole/updateRole`), redirect logs (`getLogs`) | **`_id`** | returned as raw Mongoose docs |
| users (`userPayload`), api-keys (`formatKey`), auth (`me`/login/register `user`) | **`id`** | go through explicit payload mappers |

→ Serializers must emit **`_id`** for link/role/log objects and **`id`** for user/api-key objects, matching today. The frontend reads `l._id`, `r._id`, `log._id` (e.g. `stores/links.js`, `stores/roles.js`, `components/LogModal.vue`).

### 6.2 camelCase field names (critical)

All API JSON keys remain **camelCase** regardless of snake_case columns: `destinationUrl, clickCount, isActive, expiresAt, createdBy, fullName, accountType, keyName, lastUsedAt, isPersonal, userAgent, createdAt, updatedAt`. Achieved by the Drizzle camelCase field mapping (§5) plus serializers. Snake_case must never leak to the wire.

### 6.3 `/me` roles shape

`GET /me` returns `{ user: { id, email, fullName, roles: [{ id, name, permissions }] } }`, where `permissions` is the **parsed JSON object** (not TEXT). The frontend flattens these role permission objects into `auth.permissions` and gates menus/actions via `usePermission().can(menu, action)`. Reconstruct `roles[]` by joining `user_roles → roles` and `JSON.parse(permissions)`.

### 6.4 JSON envelope & ad-hoc error bodies

- Standard envelope via `ok()`/`fail()`: success `{ success: true, ...data }` with `status`; error `{ success: false, error: { code, message } }` with the code's `status`. The `ERRORS` map ports **verbatim**, but `ok`/`fail` are **re-signatured for Hono** (`c.json(body, status)` instead of `res.status().json()`).
- **Non-`errorCodes` responses must be reproduced byte-for-byte** (they have no `code` field): `createKey` missing keyName → `{success:false, message:'keyName is required'}` (400); `updateKey`/`deleteKey`/`getKeyStats` not-found → `{success:false, message:'API Key not found'}` (404). Decision: **preserve verbatim** (do not normalize) to keep the contract.

## 7. Library migration (Node → Workers-native)

| Current (Node) | Replacement (Workers) | Notes |
|---|---|---|
| `mongoose` | `drizzle-orm` + D1 binding (`env.DB`) | schema-as-code; camelCase↔snake_case mapping |
| `jsonwebtoken` | **`jose`** | see §7.4 — hono/jwt lacks `expiresIn`/auto-`iat`; jose mirrors `jsonwebtoken` |
| `bcryptjs` | **WebCrypto PBKDF2** (`lib/password.ts`) | §7.1; greenfield → no hash compatibility needed |
| `crypto.randomBytes` (`genKey`) | `crypto.getRandomValues` + `crypto.subtle.digest` | §7.2; `ak_live_`+40 chars, then SHA-256 hash + prefix (§7.3) |
| `geoip-lite` (analytics country **and city**) | `request.cf.country` + `request.cf.city` | §7.5; stored at write time; keep `COUNTRY_NAMES` ISO→name map |
| `nanoid` v3 | `nanoid` (ESM build) | §7.6; preserve `nanoid(7)` with the **default URL-safe alphabet** (incl. `-`,`_`) |
| **`http`/`https` + streams** (`fetchPageMeta`) | **global `fetch()`** | §7.7 — CRITICAL; `nodejs_compat` does **not** polyfill outbound `http.request` |
| `dotenv`/`process.env` | wrangler `vars` + `secrets` (`env`) | `JWT_SECRET` secret; `BASE_SHORT_URL` var |
| `express`/`cors` | `hono` + `hono/cors` | CORS origin is a **deliberate change** to the new Pages origin (§15), not "parity" |
| `res.redirect`, `req.ip`, XFF parsing | `c.redirect(url, 302)`, `c.req.header('CF-Connecting-IP')` | §9 |
| `err.code === 11000` | match `'UNIQUE constraint failed'` | §14 |

> After this migration **no dependency needs Node built-ins → `nodejs_compat` is NOT required.** It is also not an escape hatch for `fetchPageMeta` (it doesn't make outbound `http.request` work).

### 7.1 Password hashing (`lib/password.ts`)

PBKDF2 via `crypto.subtle` (SHA-256, random 16-byte salt, **100 000 iterations**), stored self-describing: `pbkdf2$sha256$100000$<salt_b64>$<hash_b64>` (iteration count embedded so it can be raised later). `verify()` re-derives and compares with `crypto.subtle.timingSafeEqual`. Replaces `userSchema.pre('save')` + `comparePassword`. (Login/register run on the API domain; 100k is comfortable on Workers Paid 30s CPU; re-benchmark if Free-tier 10ms CPU applies.)

### 7.2 API-key generation (`lib/keys.ts`)

Generate the full key as `ak_live_` + 40 chars from `[a-zA-Z0-9]` via `crypto.getRandomValues(new Uint8Array(40))` (same format as today). Then derive:
- `keyHash` = SHA-256 hex of the full key (`crypto.subtle.digest('SHA-256', …)`) → stored in `key_hash`, used for auth lookup.
- `keyPrefix` = the first 14 chars (`ak_live_` + 6) → stored in `key_prefix`, shown to the user (e.g. `ak_live_a1b2c3`).

`generate()` returns `{ fullKey, keyHash, keyPrefix }`. The **`fullKey` is returned to the client exactly once** (creation/regeneration) and never persisted in plaintext.

### 7.3 API-key storage — hash + prefix + show-once (deliberate contract change)

Replaces the previous plaintext storage. The full key is **shown once** at creation/regeneration; thereafter only the non-secret `key_prefix` is retrievable. Auth hashes the incoming `x-api-key` (SHA-256) and looks it up by `key_hash` (indexed, constant-work). Search/display operate on `key_prefix` + `key_name`.

**Contract impact (drives the §15 frontend sub-project):**
- `POST /api/v1/api-keys` and `POST /auth/api-key/regenerate` responses include the **full key once** (in the existing `apiKey` field) — these paths keep working as-is on the frontend's "just created, copy it now" UI.
- `GET /auth/api-key`, `GET /api/v1/api-keys` (`listKeys`), and `formatKey` **no longer return the full key**: they return `keyPrefix` (e.g. shown masked as `ak_live_a1b2c3••••`). The management-app UI must switch from displaying/copying the full key on demand to **prefix + a show-once-on-create modal**.
- This is the single intentional deviation from "preserve contract" and is the standard pattern (GitHub/Stripe). Prefix `LIKE` search uses `idx_api_keys_prefix`.

### 7.4 JWT (`lib/jwt.ts`)

`jsonwebtoken`'s `sign({id}, secret, {expiresIn:'7d'})` auto-adds **both** `iat` and `exp`, and the current middleware sets `req.user = jwt.verify(...)` (the whole payload). `hono/jwt` has **no `expiresIn` and does not auto-add `iat`** — a naive port would drop `iat` and change `req.user`. Use **`jose`**: `new SignJWT({ id }).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret)`. Verify yields `{ id, iat, exp }` → assign to `req.user`, matching today.

### 7.5 Geo analytics

`getAnalytics`/`getLinkAnalytics` build **country and city** breakdowns. Store `country`/`city` from `request.cf` at redirect time; the ported analytics read those columns (instead of `geoip.lookup(ip)`) and keep the `COUNTRY_NAMES` ISO→display-name map (`US`→`USA`, `TH`→`Thailand`, …) and the top-10 + percent logic. Caveat: `request.cf` is **not populated under local `wrangler dev`** without `--remote`, and `cf.country`/`cf.city` may be undefined/non-standard — columns are nullable; tests must not assume real geo locally.

### 7.6 Short code

`nanoid(7)` with the **default** alphabet (URL-safe, 64 chars incl. `-` and `_`), or custom code from `req.body.code` if provided. Preserve length 7 and the default alphabet exactly (do not switch to a restricted alphabet). `crypto.randomUUID()` generates table PKs; `nanoid` generates short codes — two generators coexist intentionally.

### 7.7 URL metadata fetch (`lib/meta.ts`)

Rewrite `fetchPageMeta` with `fetch(url, { redirect:'follow', headers, signal: AbortSignal.timeout(8000) })` then read `res.text()` with a byte cap (~100 KB, matching the old `req.destroy()` cutoff), keeping the same OG/title/description regex extraction, HTML-entity decode, and `{title, description}` shape. Drop `rejectUnauthorized:false` (no equivalent). **Security note:** this fetches a **user-supplied URL** server-side → SSRF surface; consider blocking internal/metadata IP ranges (future hardening).

## 8. Auth & RBAC (ported behavior)

### 8.1 `auth` middleware — JWT **and** API key (behavior preserved)

- `x-api-key` present → **SHA-256 the incoming key** and look up `api_keys.key_hash` (§7.3), join user. Reject with existing codes (`AUTH_INVALID_API_KEY`, `AUTH_API_KEY_REVOKED`, `AUTH_API_KEY_INACTIVE`, `AUTH_API_KEY_EXPIRED`); on expiry set `status='expired'`; update `last_used_at` non-blocking (`waitUntil`). Sets `req.user = { id, email, fullName }`.
- Else `Authorization: Bearer <jwt>` → verify; sets `req.user = { id, iat, exp }`. Missing/invalid → `AUTH_NO_TOKEN`/`AUTH_INVALID_TOKEN`.
- **Known asymmetry (preserved verbatim):** the JWT path's `req.user` has no `email`/`fullName`. Controllers rely only on `req.user.id`; preserve as-is.

### 8.2 `checkPermission(menu, action)` — ported but **not wired** (preserved)

The middleware exists and is ported, but **no route applies it today** (verified: zero imports in `routes/`). RBAC is enforced **client-side** via `usePermission`. We preserve this exactly — do not add backend enforcement in this migration. (Backend RBAC enforcement is a possible future change, explicitly out of scope.)

## 9. Endpoint inventory (contract preserved)

All paths/response shapes identical to today; errors via ported `errorCodes` except the ad-hoc bodies in §6.4.

**auth** (`/api/v1/auth`) — `POST /register`, `POST /login` (status gates → `AUTH_ACCOUNT_INACTIVE`/`_SUSPENDED`/`_PENDING`), `GET /me` *(auth, §6.3)*, `PUT /profile`, `PUT /change-password` (min 6 → `AUTH_WEAK_PASSWORD`; wrong current → `AUTH_WRONG_PASSWORD`), `GET /api-key`, `POST /api-key/regenerate`.
- **`GET /api-key` returns the newest key for the user with NO `isPersonal` filter** (current behavior — do **not** add `WHERE is_personal=1`). Shape (hash+prefix change, §7.3): `{ hasKey, keyId, keyPrefix, apiKeyStatus, apiKeyExpiresAt }` — `keyPrefix` replaces the old full `apiKey` (full key is not retrievable).
- `regenerate`: delete the user's personal keys, create `Personal` (scopes `{links:'write',stats:'read'}`, `isPersonal:1`); response returns the **full key once** in `apiKey` plus `keyPrefix`.

**links** (`/api/v1/links`, all *auth*) — `GET /analytics`, `GET /meta` (§7.7), `GET /` (list by `createdBy`, newest first), `POST /` (create; `LINK_MISSING_URL`; auto-fetch meta when title/description blank; `shortUrl` from the apex (`https://blly.to/${code}`); 201), `GET /code/:code`, `PUT /:id` (`LINK_CODE_EXISTS` on dup), `DELETE /:id`, `GET /:id/logs` (newest 200), `GET /:id/analytics`.
- **`DELETE /:id` accepts id OR code**: current code uses a 24-hex-ObjectId regex to disambiguate. With UUID `TEXT` ids, switch the test to a **UUID-shape check** (else treat as `code` scoped to `createdBy`); also cascade-delete `redirect_logs` (handled by FK `ON DELETE CASCADE`).
- `deleteLinkByCode` is **dead code** (no route) — do **not** port.

**users** (`/api/v1/users`, *auth*) — `GET /` (`$regex` search over fullName+email → `LIKE`, status filter, `countDocuments`→`COUNT`, skip/limit pagination, roles join via `user_roles`; payload roles as `[{id,name}]`), `POST /`, `PUT /:id`, `DELETE /:id`.

**roles** (`/api/v1/roles`, *auth*) — `GET /` (each role includes computed **`userCount`** → `COUNT` over `user_roles GROUP BY role_id`), `POST /` (**quirk: missing `name` → `ROLE_NAME_EXISTS` (400)** — preserve verbatim), `PUT /:id`, `DELETE /:id` (also `$pull` roles from users → `DELETE FROM user_roles WHERE role_id=?`).

**api-keys** (`/api/v1/api-keys`, *auth*) — `GET /` (paginated `search,status,page,limit`; substring `LIKE` over `key_name` + `key_prefix` — full key is not stored, §7.3), `POST /` (returns **full key once** in `apiKey` + `keyPrefix`), `GET /:id/stats` (7-day timeline + device buckets + totals → SQL/JS aggregates), `PUT /:id`, `DELETE /:id`. `formatKey` returns `keyPrefix` (masked), never the full key. Not-found/validation use the ad-hoc bodies in §6.4.

**shorten** — `POST /api/v1/shorten` *(auth)* → `createLink`.

**redirect** — `GET /:code` (public, apex `blly.to` only; non-asset paths, §4.2).

> **Mongo→SQL rewrites required:** `$inc` (click count), `$in`, `populate` (joins), `countDocuments`, `sort/skip/limit`, `$regex` (→`LIKE`), `$or`, `$pull` (→`DELETE`), aggregate `userCount`, `getAnalytics`/`getKeyStats` timeline+device+geo aggregation, and `err.code===11000` (→ UNIQUE-message match, §14).

## 10. Redirect path (D1 MVP)

Runs only when the apex request is **not** a static asset (§4.2) — assets are served first; the Worker is the fallback for `/:code`.

```
GET /:code  (blly.to, non-asset path)
  1. SELECT * FROM links WHERE code = ? AND is_active = 1
       └─ none           → LINK_NOT_FOUND
       └─ expires_at past → LINK_EXPIRED
  2. c.executionCtx.waitUntil(
       (async () => { try {
         await db.batch([            // single atomic D1 batch
           UPDATE links SET click_count = click_count + 1 WHERE id = ?,
           INSERT INTO redirect_logs(id, link_id, ip, user_agent, referer, country, city, created_at) …
         ])
       } catch { /* swallow — must never fail the redirect */ } })()
     )
  3. return c.redirect(destination_url, 302)
```

`ip` ← `c.req.header('CF-Connecting-IP')` (drop XFF-splitting); `country`/`city` ← `request.cf`; `referer` stored **NULL when absent** (so analytics direct/referral counts match); `user_agent` ← header. The two writes go in one `db.batch()` (atomic) inside a swallowing `try/catch` so `click_count` and the log stay consistent and a write failure never blocks the 302.

## 11. Seeding & bootstrap

A seed step (SQL seed or `wrangler d1 execute`, run once after migrations) creates:

- An **`admin` role** whose `permissions` JSON grants every action for the **frontend-defined RBAC matrix** (the API enforces none; these drive the Vue menu/action gating):
  - **menus:** `dashboard, urls, users, docs, api_key, api_keys, roles`
  - **actions:** `view, edit, delete`
  - i.e. `{ "<menu>": { "view": true, "edit": true, "delete": true }, … }` for all seven menus.
- One **admin user** (email/password from a one-time secret/env), `bcrypt`-free PBKDF2 hash, linked to the admin role via `user_roles`.

## 12. Testing

- **Vitest + `@cloudflare/vitest-pool-workers`** against a real local D1 (Miniflare) with migrations applied to the test DB.
- Coverage: per-endpoint contract tests asserting **exact JSON shape** (`_id` vs `id`, camelCase keys, envelopes, ad-hoc error bodies), auth (JWT + API-key paths incl. expiry/revoke + `req.user` asymmetry), redirect (active/expired/missing + click increment + log insert), `listKeys`/`getUsers` search+pagination, `getRoles.userCount`, `getAnalytics`/`getKeyStats` aggregate shapes, duplicate-key → `*_EXISTS`.
- `request.cf` is absent under local `wrangler dev`/tests → mock geo or assert nullable.
- `wrangler dev` smoke test; `--remote` migration apply before deploy.

## 13. Out of scope / future (designed to layer in)

- **KV redirect cache** (`code → {destinationUrl,isActive,expiresAt}`) for <10 ms global lookups; can split redirect into its own Worker.
- **Analytics Engine** to replace per-redirect `redirect_logs` inserts; derive counts/timelines from AE.
- **Durable Object** per-link counter for strongly-consistent clicks.
- **Backend RBAC enforcement** (wire `checkPermission` into routes).
- **SSRF hardening** of the metadata fetch (block internal/metadata IP ranges).
- **API-key rotation/scoping UX** improvements (hashing itself is now in scope, §7.3).

## 14. Risks & gotchas

- **Worker CPU** — PBKDF2 at 100k iterations; bcrypt avoided.
- **No Node built-ins** — `http`/`https`/streams/`Buffer`/`fs`/`crypto.randomBytes`/`geoip-lite` removed; use `fetch`/WebCrypto/`request.cf`. **No `nodejs_compat` needed** post-rewrite (and it would not fix `fetchPageMeta`).
- **Foreign keys on D1** — enforced by default (equivalent to `PRAGMA foreign_keys=on`); cannot be toggled per query (implicit transactions). For drizzle-kit **table-rebuild** migrations that reorder FKs, wrap with `PRAGMA defer_foreign_keys = on;` (resolved by migration end) to avoid `FOREIGN KEY constraint failed`.
- **UNIQUE violations** — detect by matching the thrown message `UNIQUE constraint failed: <table>.<col>` (not Mongo `err.code===11000`); map `users.email`→`AUTH_EMAIL_EXISTS`, `links.code`→`LINK_CODE_EXISTS`, `api_keys.key_hash`→duplicate.
- **Static Assets vs redirect precedence** — on `blly.to` the Worker must run for `/:code`; do not enable SPA-fallback `not_found_handling` on the apex or the redirect never fires (§4.2). Verify a fresh code path is NOT shadowed by an asset name.
- **SQLite typing** — booleans 0/1, dates ISO text; Drizzle column modes set accordingly; insert of `undefined` on nullable `links.title/description` must store `NULL`.
- **Drizzle workflow** — use `drizzle-kit generate` + `wrangler d1 migrations apply` (no `driver:'d1-http'`/API token needed); don't mix with the HTTP push/studio flow.
- **D1 free-tier limits** — 500 MB DB, 1 MB row; `redirect_logs` is the growth driver → revisit Analytics Engine before scale.
- **`request.cf` absent locally** — country/city null under `wrangler dev` without `--remote`.
- **Contract drift is the top risk** — every `_id`/camelCase/envelope/ad-hoc-body detail in §6 is a runtime break if missed; §12 tests must assert exact shapes.

## 15. Frontend sub-project (separate spec/plan — summary only)

Tracked as its own spec/plan. The Vue app feeds **two** deploy targets:
- **Landing build → `api/public`** (this Worker's Static Assets, served at `blly.to/`, §4.2). The backend deploy depends on this build artifact existing.
- **Management app → Cloudflare Pages on `app.blly.to`.**

Frontend changes required: set `VITE_API_URL` → `https://api.blly.to/api/v1` and `VITE_BASE_SHORT_URL` → `https://blly.to`; register `https://app.blly.to` in the API's CORS allowlist; and **update the API-key UI** to the hash+prefix+show-once model (§7.3) — display `keyPrefix` (masked), show the full key only in a one-time modal right after create/regenerate, and search by prefix/name. No other API-consumer changes.

## 16. Rollout (this spec)

1. Scaffold Worker (`api/`): Hono + Drizzle + `wrangler.jsonc` (D1 binding, **Static Assets binding → `api/public`**, routes `api.blly.to/*` + `blly.to/*`, `JWT_SECRET` secret, `BASE_SHORT_URL` var, CORS origin `https://app.blly.to`).
2. `db/schema.ts` + `drizzle-kit generate` → apply `--local` then `--remote`.
3. Port `errorCodes` (map verbatim, helpers re-signatured), `lib/*` (password, jwt/jose, keys+hash, meta), middleware, controllers, serializers, routes.
4. Seed admin role (full matrix) + admin user.
5. Drop the landing build into `api/public` (from §15) so the apex serves it.
6. Tests green (vitest-pool-workers, exact-shape assertions) + `wrangler dev` smoke test.
7. Deploy Worker; bind `api.blly.to` + `blly.to` routes. Verify `/` (landing), `/:code` (redirect), `/api/v1/*` (API).
8. Verify; then decommission Vercel API + Atlas. (Management app → Pages handled in §15's sub-project.)
