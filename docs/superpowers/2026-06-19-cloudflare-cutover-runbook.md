# Cloudflare Cutover Runbook — blly.to URL Shortener

This is the operator runbook for taking the migrated Workers + D1 backend live. The
codebase is complete and fully tested locally (69/69). Every step below requires **your
Cloudflare credentials** and runs against your account — none of it can be performed by
the build agent. Run from `api/`.

> **Push/branch note:** work is on branch `migrate-to-cloudflare-d1`. Direct push to `main`
> is harness-blocked; push as the repo owner yourself (SSH auths as `siriphonNott` via
> `~/.ssh/me` — see the memory note). Open a PR from the branch.

## 0. Prerequisites
- A Cloudflare account with the `blly.to` zone added and nameservers active.
- `wrangler` authenticated: `npx wrangler login`.
- Decide three hostnames: `api.blly.to` (API), `blly.to` (redirect + landing), `app.blly.to` (management SPA).

## 1. Create the D1 database and wire its id
```bash
cd api
npx wrangler d1 create blly-db
```
Copy the returned `database_id` and replace the **placeholder** `00000000-0000-0000-0000-000000000000`
in `wrangler.jsonc` → `d1_databases[0].database_id`. (The local test suite uses an in-memory
Miniflare D1 and ignores this id; remote ops require the real one.)

## 2. Apply migrations to the remote D1
```bash
npm run db:migrate:remote   # wrangler d1 migrations apply blly-db --remote
```
Expect the 6 tables (`users, roles, user_roles, links, api_keys, redirect_logs`) created.

## 3. Set secrets
```bash
npx wrangler secret put JWT_SECRET     # paste a strong random value
```
`BASE_SHORT_URL` is already set to `https://blly.to` in `wrangler.jsonc` `vars` (not a secret).

## 4. Place the real landing build
`api/public/` currently holds a placeholder `index.html`. Drop the built landing page (the
frontend sub-project, spec §15) into `api/public/` before deploy. **Do not** configure
`assets.not_found_handling: "single-page-application"` — it would return 200 for every path
and shadow `/:code` redirects. The apex must 404 unmatched paths so `index.ts` treats them as codes.

## 5. Local smoke test (optional but recommended) — `wrangler dev`
```bash
npx wrangler dev          # http://localhost:8787 ; routing keys off the Host header
curl -i http://localhost:8787/                                   # 200 + landing HTML
curl -i -H 'Host: api.blly.to' http://localhost:8787/api/v1/health   # 200 {"success":true,"status":"ok"}
# register → create link → redirect:
TOKEN=$(curl -s -H 'Host: api.blly.to' -H 'content-type: application/json' \
  -d '{"email":"dev@x.co","password":"pw123456"}' \
  http://localhost:8787/api/v1/auth/register | sed -E 's/.*"token":"([^"]+)".*/\1/')
CODE=$(curl -s -H 'Host: api.blly.to' -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"destinationUrl":"https://example.com","title":"t","description":"d"}' \
  http://localhost:8787/api/v1/links | sed -E 's/.*"code":"([^"]+)".*/\1/')
curl -i "http://localhost:8787/$CODE"     # 302, Location: https://example.com
```
Confirms asset-vs-code precedence works.

## 6. Deploy
```bash
npm run deploy            # wrangler deploy
```
The `routes` in `wrangler.jsonc` (`api.blly.to/*`, `blly.to/*`) bind on deploy. In the
Cloudflare dashboard, also add `app.blly.to` (the management SPA — Pages or a separate
assets deployment) and ensure DNS/proxy is on for all three hostnames.

## 7. Seed the first admin (one-time, then remove)
The admin password must be PBKDF2-hashed at runtime, so seeding goes through a **transient,
token-gated route** that is added, used once, then removed. It is intentionally NOT committed.

1. Temporarily add to `src/app.ts` and add `SEED_TOKEN: string` to the `Env` type:
   ```ts
   import { seedAdmin } from './seed';
   app.post('/api/v1/_seed', async (c) => {
     if (c.req.header('x-seed-token') !== (c.env as any).SEED_TOKEN) return c.json({ success: false }, 403);
     const { email, password } = await c.req.json();
     return c.json({ success: true, ...(await seedAdmin(c.env, { email, password })) });
   });
   ```
2. `npx wrangler secret put SEED_TOKEN` (paste a random value), then `npm run deploy`.
3. ```bash
   curl -s -X POST https://api.blly.to/api/v1/_seed \
     -H "x-seed-token: <value>" -H 'content-type: application/json' \
     -d '{"email":"admin@blly.to","password":"<strong-pw>"}'
   ```
   Expect `{"success":true,"roleId":"...","userId":"..."}`. `seedAdmin` is idempotent (re-running is safe).
4. **Remove** the `_seed` route and the `SEED_TOKEN` from `Env`, redeploy, and
   `git commit -m "chore(api): remove one-time seed route"`. (Optionally delete the secret.)

## 8. Production smoke
```bash
curl -i https://api.blly.to/api/v1/health         # 200 {"success":true,"status":"ok"}
curl -i https://blly.to/                          # 200 landing
# create a link via the API (as in step 5) then:
curl -i https://blly.to/<code>                    # 302 to destination
```

## 9. Decommission the old stack
- Point the frontend/management app at `https://api.blly.to/api/v1`.
- Retire the Vercel API project (the legacy `vercel.json` and Express tree are already removed from this repo).
- Decommission the MongoDB Atlas cluster once traffic is confirmed on D1.

---

### What is already done in the repo (no action needed)
- Full Workers/Hono + D1/Drizzle backend, all endpoints, redirect, RBAC, API-key hash+prefix+show-once.
- `wrangler.jsonc`: assets binding, D1 binding (placeholder id), production `routes`, `vars.BASE_SHORT_URL=https://blly.to`.
- CORS locked to `https://app.blly.to` (+ `http://localhost:5173` for dev) in `src/app.ts`.
- Legacy Express src tree and `vercel.json` removed.
- 69 local tests passing (`npm test`).

---

## Frontend deploy (management SPA + landing)

The `web/` Vue SPA contains both the landing (`/`) and the management app (`/login`, `/dashboard`, …). It is split across two hosts:

- **`app.eraflow.dev`** — the full SPA, deployed as a static-assets Worker (`web/wrangler.jsonc`, `blly-web`) with `not_found_handling: single-page-application` so history-mode routes resolve on refresh/deep-link.
- **`eraflow.dev` (apex)** — the **same build** is copied into `api/public/` and served by the API Worker; `/` = landing, `/{code}` = redirect. The apex CANNOT use SPA fallback (it would shadow `/{code}`), so the landing's Login/CTA buttons link to `VITE_APP_URL` (`https://app.eraflow.dev`) rather than client-side routes.

Build-time config is `web/.env.production` (`VITE_API_URL=https://api.eraflow.dev/api/v1`, `VITE_BASE_SHORT_URL=https://eraflow.dev`, `VITE_APP_URL=https://app.eraflow.dev`).

To (re)deploy the frontend after any `web/` change — **rebuild and deploy BOTH**, or the apex landing goes stale:
```bash
cd web && npm run build                 # → web/dist (uses .env.production)
npx wrangler deploy                      # → app.eraflow.dev (blly-web)
rm -rf ../api/public/* && cp -r dist/. ../api/public/   # refresh apex landing assets
cd ../api && npx wrangler deploy         # → eraflow.dev apex + api.eraflow.dev (blly-api)
```
> `api/public/` is a generated copy of `web/dist` (committed so the API Worker deploys standalone). Always regenerate it from `web/dist` — do not hand-edit.

When moving to blly.to later: update `web/.env.production` (app/api/short URLs), `web/wrangler.jsonc` route, and `api/wrangler.jsonc` routes/BASE_SHORT_URL + CORS origin, then rebuild + redeploy both.
