# Sign-up page: Google + Email/Password + Turnstile — Design

**Date:** 2026-06-20
**Status:** Approved (brainstorming) — pending spec review before plan
**Scope:** Add a public sign-up page to the SPA with three ways to prove intent: Continue with
Google (real OAuth via Google Identity Services), Email & Password registration, and a Cloudflare
Turnstile "Verify you are human" challenge gating the email/password path.

## Goal

Today the app has `LoginView.vue` and a backend `POST /auth/register` (email + password → auto-login),
but **no sign-up page, no `/signup` route, no Google sign-in, and no bot protection**. This adds a
`/signup` page on `app.eraflow.dev` wiring all three, with the backend changes required to make Google
sign-in and Turnstile verification actually work.

Non-goals (YAGNI this round): email verification, password reset, protecting the existing `/login` page
with Turnstile, multi-provider OAuth beyond Google.

## Decisions (locked during brainstorming)

1. **Google sign-in is real**, using **Google Identity Services (GIS) ID-token flow** — not the
   redirect/auth-code flow. Frontend gets an ID token client-side; backend verifies its signature
   against Google's JWKS with `jose` (already a dependency). Only a **public Client ID** is needed —
   no client secret to store.
2. **Turnstile uses dev test keys for local** (always-pass), real widget provisioned at deploy time.
3. **Turnstile gates the email/password sign-up only.** Google's flow is bot-resistant by design.
   `/login` is left untouched.
4. **No table rebuild.** Google-only users are supported by adding a nullable `google_sub` column and
   keeping `password NOT NULL` with an empty-string sentinel.
5. **Auto-login after sign-up** (email or Google) → `/dashboard`, matching the existing register flow.

## Architecture

- **Frontend:** new `web/src/views/SignupView.vue` at route `/signup` (meta `guest`), styled to match
  `LoginView.vue`. Loads the GIS and Turnstile scripts dynamically (only on this page, so the apex
  landing is unaffected). Talks to the API via the existing axios client + pinia auth store.
- **Backend:** modify `POST /api/v1/auth/register` to enforce a password minimum and verify Turnstile;
  add `POST /api/v1/auth/google` for sign-in/sign-up via verified Google ID token. Two new pure-lib
  helpers (`lib/turnstile.ts`, `lib/google.ts`), ESM + WebCrypto/`fetch` only (no Node built-ins).
- **Data:** one additive migration on `users` (`google_sub` column + unique index), mirrored in
  `schema.ts`.

All responses keep the **flat envelope** invariant: success `{ success:true, token, user }`, errors
`{ success:false, errorCode, message }` via `ok()`/`fail()`.

## UX flow (SignupView)

Card layout, top → bottom:

1. Brand header — "Blly.to" + subtitle "Create your account".
2. **Continue with Google** button (GIS). Hidden when `VITE_GOOGLE_CLIENT_ID` is empty.
3. "or" divider.
4. **Email** + **Password** fields (show/hide toggle, matching login).
5. **Turnstile widget** — "Verify you are human".
6. **Create account** submit button — disabled until a Turnstile token is present.
7. "Already have an account? **Sign in**" → `/login`.

Cross-links:
- `LoginView.vue` gains "Don't have an account? **Sign up**" → `/signup`.
- `LandingView.vue` "Get Started Free" (`ctaPrimary`) → `${VITE_APP_URL}/signup` (was `/login`).

On success (either path): store token → `auth.fetchMe()` → `router.push('/dashboard')`.

## Data model

Additive migration (hand-written to match the existing `drizzle/` style; **not** a drizzle-kit table
rebuild), plus mirror in `schema.ts`:

```sql
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX idx_users_google_sub ON users(google_sub);
```

- `google_sub` is nullable; SQLite treats multiple NULLs as distinct, so existing password users are
  unaffected by the unique index.
- `password` stays `NOT NULL`. Google-created accounts store `password = ''` — a sentinel meaning "no
  password set". `verifyPassword('', '')` always fails, so password-login is impossible for a
  Google-only account (correct). If such a user later sets a password, it becomes a normal hash.

`schema.ts` change: add `googleSub: text('google_sub')` to `users` and the `idx_users_google_sub`
unique index in the table's index builder.

## Backend API

### `POST /api/v1/auth/register` (modified)

Body: `{ email, password, turnstileToken }`. Order:

1. `if (!email || !password) → AUTH_MISSING_FIELDS` (existing).
2. `if (password.length < 6) → AUTH_WEAK_PASSWORD` (**new** — register currently skips length checks
   that login/change-password enforce).
3. `if (!await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip)) → AUTH_TURNSTILE_FAILED`.
4. Insert user (existing logic) → sign token → `{ token, user }` 201. `UNIQUE` violation →
   `AUTH_EMAIL_EXISTS` (existing).

### `POST /api/v1/auth/google` (new)

Body: `{ idToken }`.

1. `const claims = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID)` → on any failure
   (bad signature, wrong `aud`/`iss`, expired) → `AUTH_GOOGLE_INVALID`.
2. Look up user by `google_sub === claims.sub`. If found → issue app token, return `{ token, user }`.
3. Else look up by `email === claims.email`. If found → **link**: set `google_sub = claims.sub`
   (and `fullName = claims.name` if currently empty) → issue token, return `{ token, user }`.
4. Else **create**: `{ id, email, password:'', fullName: claims.name ?? '', accountType:'free',
   status:'active', google_sub: claims.sub, createdAt, updatedAt }` → issue token → `{ token, user }`
   201.

Status checks (`inactive`/`suspended`/`pending_verification`) mirror `login` for existing accounts.

### Lib helpers

- `lib/turnstile.ts` → `verifyTurnstile(token: string, secret: string, remoteip?: string): Promise<boolean>`
  — POSTs form body (`secret`, `response`, optional `remoteip`) to
  `https://challenges.cloudflare.com/turnstile/v0/siteverify`, returns the parsed `success` boolean.
  Returns `false` (never throws) on empty token or non-OK response. IP comes from the
  `CF-Connecting-IP` request header when available.
- `lib/google.ts` → `verifyGoogleIdToken(idToken: string, clientId: string): Promise<{ sub, email, name, emailVerified }>`
  — uses a module-level `createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))`
  and `jwtVerify` with `issuer: ['https://accounts.google.com','accounts.google.com']` and
  `audience: clientId`. Throws on any verification failure (caller maps to `AUTH_GOOGLE_INVALID`).

### Error codes (added to `lib/errorCodes.ts`)

- `AUTH_TURNSTILE_FAILED` — `'Human verification failed, please try again'`, 400.
- `AUTH_GOOGLE_INVALID` — `'Google sign-in failed, please try again'`, 401.

### Env bindings (`env.d.ts`)

Add to `Env`: `TURNSTILE_SECRET_KEY: string`, `GOOGLE_CLIENT_ID: string`.

## Frontend

### `SignupView.vue` (new)

- Dynamic script loader (injects once, resolves a promise on `onload`) for GIS
  (`https://accounts.google.com/gsi/client`) and Turnstile
  (`https://challenges.cloudflare.com/turnstile/v0/api.js`).
- **Google:** if `import.meta.env.VITE_GOOGLE_CLIENT_ID` is empty, the Google button + "or" divider are
  hidden (local dev without a Client ID still supports email sign-up). GIS callback → `idToken` →
  `auth.googleSignin(idToken)` → on success navigate to `/dashboard`.
- **Turnstile:** render widget with `VITE_TURNSTILE_SITE_KEY`; store the token from the success
  callback in a `ref`; submit disabled until the token exists; wire `error-callback`/`expired-callback`
  to reset the token (and reset the widget so the user can retry).
- **Email submit:** `auth.register(email, password, turnstileToken)` → `fetchMe()` → `/dashboard`.
  Map `errorCode` to localized messages.

### `stores/auth.js`

- `register(email, password, turnstileToken)` — extend signature; send `turnstileToken` in the body.
- `googleSignin(idToken)` — new: `POST /auth/google`, store `token` + `user` like `login`.

### Router

Add `{ path: '/signup', component: () => import('../views/SignupView.vue'), meta: { guest: true } }`.
The existing `beforeEach` guard already redirects `guest` routes to `/dashboard` when a token exists.

### i18n (`web/src/i18n/en.js` + `th.js`, `auth` namespace)

Add: `signupTitle`, `signupSubtitle`, `continueWithGoogle`, `orDivider`, `verifyHuman`, `createAccount`,
`haveAccount`, `signInLink`, `noAccount`, `signUpLink`, `errorTurnstile`, `errorGoogle`.

### Frontend env (`web/.env`)

- `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (Cloudflare always-pass test site key).
- `VITE_GOOGLE_CLIENT_ID=` (user fills a real Client ID to exercise Google locally; empty hides the
  button).

## Config / testing / deploy

### Local config

- `api/.dev.vars` (gitignored): add
  `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (Cloudflare always-pass test secret) and
  `GOOGLE_CLIENT_ID=<real client id or empty>`.
- `web/.env`: as above.

### Testing (`api/test/`, vitest-pool-workers, offline Miniflare)

Both new paths make outbound `fetch` calls (siteverify; Google JWKS) — tests **must mock outbound
fetch** via `cloudflare:test` `fetchMock` (no real network). Cases to add:

- register succeeds when Turnstile verify returns `success:true`.
- register → `AUTH_TURNSTILE_FAILED` when siteverify returns `success:false`.
- register → `AUTH_WEAK_PASSWORD` when password < 6 chars.
- google → creates a new user (with `google_sub`, `password:''`).
- google → links onto an existing email (sets `google_sub`, keeps the same user id).
- google → `AUTH_GOOGLE_INVALID` on a malformed/expired/wrong-audience token.

Google JWKS test strategy: generate an RSA keypair with `jose.generateKeyPair` in the test, mock the
JWKS endpoint to return the public JWK, and sign a test ID token with the private key so `jwtVerify`
passes. **Do not** touch `isolatedStorage` or `vitest.config.ts`; seed any prerequisite rows in
`beforeAll`. Goal: existing 70 tests stay green + new cases pass.

### Deploy (only after local confirmation — workflow is test → confirm → deploy)

- Backend: `wrangler secret put TURNSTILE_SECRET_KEY` (real secret). `GOOGLE_CLIENT_ID` is public — add
  it to `wrangler.jsonc` `vars`.
- Frontend prod: `web/.env.production` gets real `VITE_TURNSTILE_SITE_KEY` + `VITE_GOOGLE_CLIENT_ID`;
  rebuild + deploy **both** Workers (SPA and the apex landing refresh) per CLAUDE.md.
- Turnstile: provision the real widget for `eraflow.dev` via the `turnstile-spin` skill.
- Google Cloud (user action): create an OAuth Web client; Authorized JavaScript origins =
  `https://app.eraflow.dev` + `http://localhost:5173`.
- CORS: existing allowlist already covers `app.eraflow.dev` + `localhost:5173` — no change.

## Invariants honored

- Flat error envelope via `fail()`; success via `ok()`.
- Wire field names camelCase; user objects keyed by `id` (via `userPayload`).
- ESM + WebCrypto/`fetch` only; `jose` for all JWT work; no Node built-ins; no `nodejs_compat` in
  production config.
- API keys, RBAC-client-side, link ownership rules — untouched.

## Open dependency (external, user-provided)

A real **Google OAuth Client ID** is required to exercise the Google button (locally and in prod);
Google offers no universal test client. Email + Turnstile sign-up is fully testable locally without it.
