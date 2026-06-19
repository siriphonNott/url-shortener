# Cloudflare D1 + Workers Migration (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-implement the `blly.to` URL-shortener backend on Cloudflare — Express/Mongo → Hono/D1 (Drizzle) on one Worker that also serves the landing static assets and the `/:code` redirect — preserving the existing API contract except the deliberate API-key hash+prefix+show-once change.

**Architecture:** A single Worker (TypeScript + ESM) routes `api.blly.to/*` to a Hono app (auth, links, users, roles, api-keys, shorten) backed by D1 via Drizzle, and `blly.to/*` to Static Assets (landing) with the Worker as the non-asset fallback for `/:code` redirects. Controllers are ported 1:1 from the Express controllers; a serializer layer reproduces the exact legacy JSON (`_id`, camelCase, nested role shapes). Node-only deps are replaced with Workers-native equivalents (jose, WebCrypto, `fetch`, `request.cf`).

**Tech Stack:** Cloudflare Workers, Hono, D1 (SQLite), Drizzle ORM + drizzle-kit, jose, WebCrypto (PBKDF2 + SHA-256), nanoid, Vitest + `@cloudflare/vitest-pool-workers`, Wrangler.

**Spec:** `docs/superpowers/specs/2026-06-19-cloudflare-d1-migration-design.md` (read it before starting).

## Global Constraints

- **Runtime:** Cloudflare Workers, ESM only. No Node built-ins (`http`/`https`/`fs`/`Buffer`/`crypto.randomBytes`). **No `nodejs_compat` flag.**
- **Language:** TypeScript, `compatibility_date` `2024-09-23` or later (Static Assets + `nodejs` APIs unaffected).
- **API base path:** all API routes under `/api/v1`. Preserve every path exactly.
- **Response envelope (FLAT — exactly as OLD `errorCodes.js`):** success `{ success: true, ...data }`; error `{ success: false, errorCode: <code>, message: <message> }` (top-level `errorCode` + `message`, NOT nested). Status from the `ERRORS` map. Ad-hoc bodies (spec §6.4) reproduced verbatim where they exist (`{ success:false, message }`, no code field).
- **Field names on the wire:** camelCase always (`destinationUrl, clickCount, isActive, expiresAt, createdBy, fullName, accountType, keyName, lastUsedAt, isPersonal, userAgent, createdAt, updatedAt`). PK is **`_id`** for link/role/log objects and **`id`** for user/api-key objects.
- **IDs:** table PKs are `crypto.randomUUID()` (TEXT). Short codes are `nanoid(7)` (default URL-safe alphabet).
- **Booleans:** stored as INTEGER 0/1. **Dates:** ISO-8601 TEXT. **JSON columns** (`permissions`, `scopes`): TEXT, parsed/serialized at the controller boundary.
- **JWT:** HS256, payload `{ id, iat, exp }`, 7-day expiry (jose).
- **API keys:** store `key_hash` (SHA-256 hex) + `key_prefix`; full key returned once on create/regenerate; never retrievable after.
- **TDD:** every task is failing-test → run-fail → implement → run-pass → commit. Frequent commits. DRY, YAGNI.
- **Env bindings (the `Env` type, defined in Task 1, used everywhere):**
  ```ts
  export type Env = {
    DB: D1Database;
    ASSETS: Fetcher;        // Static Assets binding (landing)
    JWT_SECRET: string;     // secret
    BASE_SHORT_URL: string; // var, e.g. https://blly.to
  };
  export type AuthUser = { id: string; email?: string; fullName?: string; iat?: number; exp?: number };
  ```

---

## File Structure

```
api/
├── src/
│   ├── index.ts                 # Worker entry: hostname routing + assets fallback
│   ├── app.ts                   # Hono app: mounts /api/v1/* routers, CORS, error handler
│   ├── env.d.ts                 # Env + AuthUser types, Hono generics
│   ├── db/
│   │   ├── schema.ts            # Drizzle tables (camelCase fields → snake_case columns)
│   │   └── client.ts            # getDb(env) -> DrizzleD1Database
│   ├── lib/
│   │   ├── errorCodes.ts        # ERRORS map (verbatim) + ok()/fail() for Hono
│   │   ├── password.ts          # hashPassword/verifyPassword (PBKDF2)
│   │   ├── jwt.ts               # signToken/verifyToken (jose)
│   │   ├── keys.ts              # generateKey/hashKey/keyPrefixOf (WebCrypto)
│   │   ├── meta.ts              # fetchPageMeta (fetch-based)
│   │   ├── geo.ts               # COUNTRY_NAMES map + parseDevice (ported)
│   │   └── time.ts              # nowIso(), last7Days() helpers
│   ├── serializers/index.ts     # serializeLink/Role/Log, userPayload(+Roles), formatKey
│   ├── middleware/
│   │   ├── auth.ts              # JWT + x-api-key
│   │   └── checkPermission.ts   # ported (not wired)
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── linkController.ts
│   │   ├── userController.ts
│   │   ├── roleController.ts
│   │   ├── apiKeyController.ts
│   │   └── redirectController.ts
│   ├── routes/                  # one router file per resource (auth/links/users/roles/apiKeys)
│   └── seed.ts                  # admin role + user (run via wrangler d1 execute or a script)
├── public/                      # landing build output (from frontend sub-project; may be a placeholder index.html during backend dev)
├── test/                        # vitest tests mirroring src/
├── drizzle/                     # generated migrations
├── drizzle.config.ts
├── wrangler.jsonc
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

> **Note on the existing `api/` directory:** the current Express app lives in `api/` (CommonJS, `node_modules`, `index.js`, `src/...`). Build the new Worker alongside it, then remove the Express files at the end (Task 19). Keep the old code untouched until the new one passes tests, so you can cross-reference behavior. Reference paths to the OLD code below use `OLD:` (e.g. `OLD: api/src/controllers/authController.js`).

---

## Task 1: Scaffold the Worker (Hono + TypeScript + Vitest)

**Files:**
- Create: `api/package.json`, `api/tsconfig.json`, `api/wrangler.jsonc`, `api/vitest.config.ts`, `api/src/env.d.ts`, `api/src/app.ts`, `api/src/index.ts`
- Test: `api/test/smoke.test.ts`

**Interfaces:**
- Produces: `app` (Hono instance) from `app.ts`; default export Worker from `index.ts`; `Env`/`AuthUser` types from `env.d.ts`.

- [ ] **Step 1: Create `api/package.json`** (new file; the old one will be overwritten)

```json
{
  "name": "url-shortener-api",
  "version": "2.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply blly-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply blly-db --remote"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "drizzle-orm": "^0.36.0",
    "jose": "^5.9.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "@cloudflare/workers-types": "^4.20240909.0",
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "wrangler": "^3.80.0"
  }
}
```

- [ ] **Step 2: Create `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src", "test", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create `api/wrangler.jsonc`** (bindings filled in Task 18/19; minimal now)

```jsonc
{
  "name": "blly-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-09-23",
  "observability": { "enabled": true },
  "assets": { "directory": "./public", "binding": "ASSETS" },
  "d1_databases": [
    { "binding": "DB", "database_name": "blly-db", "database_id": "PLACEHOLDER_SET_IN_TASK_2", "migrations_dir": "drizzle" }
  ],
  "vars": { "BASE_SHORT_URL": "http://localhost:8787" }
}
```

- [ ] **Step 4: Create `api/src/env.d.ts`**

```ts
export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  BASE_SHORT_URL: string;
};

export type AuthUser = { id: string; email?: string; fullName?: string; iat?: number; exp?: number };

export type AppBindings = { Bindings: Env; Variables: { user: AuthUser } };
```

- [ ] **Step 5: Create `api/src/app.ts`** (skeleton; routers mounted in later tasks)

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppBindings } from './env';

export const app = new Hono<AppBindings>();

app.use('/api/v1/*', cors({ origin: ['https://app.blly.to', 'http://localhost:5173'] }));

app.get('/api/v1/health', (c) => c.json({ success: true, status: 'ok' }));

export default app;
```

- [ ] **Step 6: Create `api/src/index.ts`** (hostname routing; redirect wired in Task 18)

```ts
import app from './app';
import type { Env } from './env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
```

- [ ] **Step 7: Create `api/vitest.config.ts`** (reads the generated D1 migrations and exposes them as a test binding so a setup file can apply them — vitest-pool-workers does **NOT** auto-apply migrations)

```ts
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  // Reads SQL from ./drizzle (must exist — generated in Task 2). Empty until then; that's fine for Task 1's smoke test.
  const migrations = await readD1Migrations('./drizzle').catch(() => []);
  return {
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            compatibilityDate: '2024-09-23',
            bindings: { TEST_MIGRATIONS: migrations },
          },
        },
      },
    },
  };
});
```

- [ ] **Step 7b: Create `api/test/apply-migrations.ts`** (runs before each test file; applies all D1 migrations to the isolated test DB — idempotent)

```ts
import { applyD1Migrations, env } from 'cloudflare:test';

// TEST_MIGRATIONS is injected by vitest.config.ts; apply to the per-test D1 instance.
await applyD1Migrations(env.DB, (env as any).TEST_MIGRATIONS ?? []);
```

> Add `TEST_MIGRATIONS` to the test env typing if you add a `cloudflare:test` `ProvidedEnv` declaration; casting `(env as any)` here avoids needing it. The smoke test in Task 1 doesn't touch D1, so an empty migrations array is fine until Task 2 generates real ones.

- [ ] **Step 8: Create a placeholder landing asset** so the assets binding has a directory

Create `api/public/index.html` with `<!doctype html><title>blly.to</title><h1>blly.to</h1>` (real landing build replaces this in §15).

- [ ] **Step 9: Write the smoke test** `api/test/smoke.test.ts`

```ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('smoke', () => {
  it('health endpoint returns ok', async () => {
    const req = new Request('https://api.blly.to/api/v1/health');
    const ctx = createExecutionContext();
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: 'ok' });
  });
});
```

- [ ] **Step 10: Install deps and run the test**

Run: `cd api && npm install && npm test`
Expected: `smoke > health endpoint returns ok` PASS.

- [ ] **Step 11: Commit**

```bash
git add api/package.json api/tsconfig.json api/wrangler.jsonc api/vitest.config.ts api/test/apply-migrations.ts api/src/env.d.ts api/src/app.ts api/src/index.ts api/public/index.html api/test/smoke.test.ts
git commit -m "feat(api): scaffold Hono Worker with vitest-pool-workers"
```

---

## Task 2: D1 schema (Drizzle) + first migration

**Files:**
- Create: `api/src/db/schema.ts`, `api/src/db/client.ts`, `api/drizzle.config.ts`
- Test: `api/test/db/schema.test.ts`

**Interfaces:**
- Produces: Drizzle table objects `users, roles, userRoles, links, apiKeys, redirectLogs` from `schema.ts`; `getDb(env: Env)` from `client.ts` returning `DrizzleD1Database<typeof schema>`.

- [ ] **Step 1: Create `api/src/db/schema.ts`** (camelCase fields → snake_case columns)

```ts
import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  fullName: text('full_name').notNull().default(''),
  accountType: text('account_type').notNull().default('free'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  permissions: text('permissions').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
  roleIdx: index('idx_user_roles_role').on(t.roleId),
}));

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title: text('title'),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  clickCount: integer('click_count').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  byUser: index('idx_links_created_by').on(t.createdBy),
  byCreated: index('idx_links_created_at').on(t.createdAt),
}));

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyName: text('key_name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  scopes: text('scopes').notNull().default('{"links":"read","stats":"read"}'),
  status: text('status').notNull().default('active'),
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  isPersonal: integer('is_personal').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  byUser: index('idx_api_keys_user').on(t.userId),
  byPrefix: index('idx_api_keys_prefix').on(t.keyPrefix),
}));

export const redirectLogs = sqliteTable('redirect_logs', {
  id: text('id').primaryKey(),
  linkId: text('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  country: text('country'),
  city: text('city'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  byLink: index('idx_redirect_logs_link').on(t.linkId),
  byCreated: index('idx_redirect_logs_created_at').on(t.createdAt),
}));

export const schema = { users, roles, userRoles, links, apiKeys, redirectLogs };
```

- [ ] **Step 2: Create `api/src/db/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/d1';
import type { Env } from '../env';
import { schema } from './schema';

export const getDb = (env: Env) => drizzle(env.DB, { schema });
export type DB = ReturnType<typeof getDb>;
```

- [ ] **Step 3: Create `api/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
```

- [ ] **Step 4: Create the D1 database and capture its id**

Run: `cd api && npx wrangler d1 create blly-db`
Then paste the printed `database_id` into `wrangler.jsonc` (replace `PLACEHOLDER_SET_IN_TASK_2`).

- [ ] **Step 5: Generate the migration**

Run: `cd api && npm run db:generate`
Expected: a new SQL file appears under `api/drizzle/` creating all six tables + indexes.

- [ ] **Step 6: Add CHECK constraints to the generated migration**

drizzle-kit does not emit the enum CHECKs. Open the generated `drizzle/0000_*.sql` and add to the `users` table definition:
`account_type` → append `CHECK (account_type IN ('free','premium','enterprise'))`,
`status` → append `CHECK (status IN ('active','inactive','suspended','pending_verification'))`,
and on `api_keys.status` → `CHECK (status IN ('active','inactive','expired','revoked'))`.
(These match the Mongoose enums; D1 enforces them.)

- [ ] **Step 7: Apply locally**

Run: `cd api && npm run db:migrate:local`
Expected: "Migrations applied" with 6 tables created.

- [ ] **Step 8: Write the schema test** `api/test/db/schema.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('schema', () => {
  it('creates all six tables', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all<{ name: string }>();
    const names = results.map((r) => r.name);
    for (const t of ['users', 'roles', 'user_roles', 'links', 'api_keys', 'redirect_logs']) {
      expect(names).toContain(t);
    }
  });

  it('enforces the account_type CHECK', async () => {
    await env.DB.prepare(
      "INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)"
    ).bind('u1', 'a@b.co', 'h', '', 'free', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z').run();
    await expect(
      env.DB.prepare(
        "INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)"
      ).bind('u2', 'c@d.co', 'h', '', 'WRONG', 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z').run()
    ).rejects.toThrow();
  });
});
```

> Migrations are applied to the isolated test DB by `test/apply-migrations.ts` (Task 1 Step 7b) via `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)`. This requires the migration SQL to exist (Step 5 above) **before** running tests — vitest-pool-workers does NOT auto-apply migrations. After Step 5, re-run any earlier test and tables will be present.

- [ ] **Step 9: Run the test**

Run: `cd api && npm test -- schema`
Expected: both tests PASS.

- [ ] **Step 10: Commit**

```bash
git add api/src/db api/drizzle api/drizzle.config.ts api/wrangler.jsonc api/test/db/schema.test.ts
git commit -m "feat(api): D1 schema via Drizzle + initial migration"
```

---

## Task 3: errorCodes + Hono `ok`/`fail`

**Files:**
- Create: `api/src/lib/errorCodes.ts`
- Test: `api/test/lib/errorCodes.test.ts`
- Reference: `OLD: api/src/config/errorCodes.js` (copy the full `ERRORS` map verbatim)

**Interfaces:**
- Produces: `ERRORS` (record of `{code,message,status}`), `ok(c, data?, status?)`, `fail(c, key)`.

- [ ] **Step 1: Write the failing test** `api/test/lib/errorCodes.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { ok, fail, ERRORS } from '../../src/lib/errorCodes';

const app = new Hono();
app.get('/ok', (c) => ok(c, { token: 't' }, 201));
app.get('/fail', (c) => fail(c, 'AUTH_NO_TOKEN'));

describe('errorCodes', () => {
  it('ok wraps data with success:true and status', async () => {
    const res = await app.request('/ok');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, token: 't' });
  });
  it('fail returns the FLAT mapped envelope and status', async () => {
    const res = await app.request('/fail');
    expect(res.status).toBe(ERRORS.AUTH_NO_TOKEN.status);
    expect(await res.json()).toEqual({
      success: false,
      errorCode: 'AUTH_NO_TOKEN',
      message: ERRORS.AUTH_NO_TOKEN.message,
    });
  });
});
```

- [ ] **Step 2: Run it — expect failure** (`Cannot find module errorCodes`).
Run: `cd api && npm test -- errorCodes` → FAIL.

- [ ] **Step 3: Implement `api/src/lib/errorCodes.ts`**

Copy the entire `ERRORS` object from `OLD: api/src/config/errorCodes.js` verbatim (every key/message/status), then export Hono helpers:

```ts
import type { Context } from 'hono';

// Verbatim from OLD api/src/config/errorCodes.js (all 24 entries).
export const ERRORS = {
  AUTH_MISSING_FIELDS: { code: 'AUTH_MISSING_FIELDS', message: 'Email and password are required', status: 400 },
  AUTH_EMAIL_EXISTS: { code: 'AUTH_EMAIL_EXISTS', message: 'Email already exists', status: 400 },
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password', status: 401 },
  AUTH_NO_TOKEN: { code: 'AUTH_NO_TOKEN', message: 'No token provided', status: 401 },
  AUTH_INVALID_TOKEN: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired token', status: 401 },
  AUTH_INVALID_API_KEY: { code: 'AUTH_INVALID_API_KEY', message: 'Invalid API key', status: 401 },
  AUTH_API_KEY_INACTIVE: { code: 'AUTH_API_KEY_INACTIVE', message: 'API key is inactive', status: 401 },
  AUTH_API_KEY_EXPIRED: { code: 'AUTH_API_KEY_EXPIRED', message: 'API key has expired', status: 401 },
  AUTH_API_KEY_REVOKED: { code: 'AUTH_API_KEY_REVOKED', message: 'API key has been revoked', status: 401 },
  AUTH_MISSING_PW_FIELDS: { code: 'AUTH_MISSING_PW_FIELDS', message: 'currentPassword and newPassword are required', status: 400 },
  AUTH_WRONG_PASSWORD: { code: 'AUTH_WRONG_PASSWORD', message: 'Current password is incorrect', status: 400 },
  AUTH_WEAK_PASSWORD: { code: 'AUTH_WEAK_PASSWORD', message: 'Password must be at least 6 characters', status: 400 },
  AUTH_ACCOUNT_INACTIVE: { code: 'AUTH_ACCOUNT_INACTIVE', message: 'Your account is inactive', status: 403 },
  AUTH_ACCOUNT_SUSPENDED: { code: 'AUTH_ACCOUNT_SUSPENDED', message: 'Your account has been suspended', status: 403 },
  AUTH_ACCOUNT_PENDING: { code: 'AUTH_ACCOUNT_PENDING', message: 'Your account is pending verification', status: 403 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action', status: 403 },
  USER_NOT_FOUND: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
  ROLE_NOT_FOUND: { code: 'ROLE_NOT_FOUND', message: 'Role not found', status: 404 },
  ROLE_NAME_EXISTS: { code: 'ROLE_NAME_EXISTS', message: 'Role name already exists', status: 400 },
  LINK_MISSING_URL: { code: 'LINK_MISSING_URL', message: 'destinationUrl is required', status: 400 },
  LINK_CODE_EXISTS: { code: 'LINK_CODE_EXISTS', message: 'Short code already exists', status: 400 },
  LINK_NOT_FOUND: { code: 'LINK_NOT_FOUND', message: 'Link not found', status: 404 },
  LINK_EXPIRED: { code: 'LINK_EXPIRED', message: 'This link has expired', status: 410 },
  SERVER_ERROR: { code: 'SERVER_ERROR', message: 'Internal server error', status: 500 },
} as const satisfies Record<string, { code: string; message: string; status: number }>;

export type ErrorKey = keyof typeof ERRORS;

export const ok = (c: Context, data: Record<string, unknown> = {}, status = 200) =>
  c.json({ success: true, ...data }, status as any);

// FLAT body, byte-identical to OLD fail(): { success:false, errorCode, message }
export const fail = (c: Context, key: ErrorKey) => {
  const e = ERRORS[key] || ERRORS.SERVER_ERROR;
  return c.json({ success: false, errorCode: e.code, message: e.message }, e.status as any);
};
```

> **Important (contract fidelity):** OLD `ok(res,data,status)` spread `data` at the top level (`{ success, ...data }`) and OLD `fail(res,key)` returned a FLAT `{ success:false, errorCode, message }` (NOT nested under `error`). Match both exactly — the live frontend reads `errorCode`/`message`.

- [ ] **Step 4: Run the test — expect pass.** Run: `cd api && npm test -- errorCodes` → PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/errorCodes.ts api/test/lib/errorCodes.test.ts
git commit -m "feat(api): port errorCodes with Hono ok/fail helpers"
```

---

## Task 4: Password hashing (PBKDF2)

**Files:**
- Create: `api/src/lib/password.ts`
- Test: `api/test/lib/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(pw: string): Promise<string>` (format `pbkdf2$sha256$<iter>$<saltB64>$<hashB64>`), `verifyPassword(pw: string, stored: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password', () => {
  it('hashes to the self-describing format', async () => {
    const h = await hashPassword('secret123');
    expect(h.startsWith('pbkdf2$sha256$100000$')).toBe(true);
    expect(h.split('$')).toHaveLength(5);
  });
  it('verifies the correct password', async () => {
    const h = await hashPassword('secret123');
    expect(await verifyPassword('secret123', h)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    const h = await hashPassword('secret123');
    expect(await verifyPassword('nope', h)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- password`

- [ ] **Step 3: Implement `api/src/lib/password.ts`**

```ts
const ITER = 100_000;
const enc = new TextEncoder();

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iter: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, ITER);
  return `pbkdf2$sha256$${ITER}$${b64(salt.buffer)}$${b64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, hash, iterStr, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2' || hash !== 'sha256') return false;
  const salt = fromB64(saltB64);
  const bits = await derive(password, salt, Number(iterStr));
  const a = new Uint8Array(bits);
  const b = fromB64(hashB64);
  if (a.length !== b.length) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}
```

> `crypto.subtle.timingSafeEqual` is available in the Workers runtime (tests run in workerd via vitest-pool-workers, so it is present). It **throws** on unequal-length inputs, so the `a.length !== b.length` guard above is required, not optional.

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- password`

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/password.ts api/test/lib/password.test.ts
git commit -m "feat(api): WebCrypto PBKDF2 password hashing"
```

---

## Task 5: JWT (jose)

**Files:**
- Create: `api/src/lib/jwt.ts`
- Test: `api/test/lib/jwt.test.ts`

**Interfaces:**
- Produces: `signToken(id: string, secret: string): Promise<string>`, `verifyToken(token: string, secret: string): Promise<AuthUser>` (returns `{ id, iat, exp }`; throws on invalid/expired).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/lib/jwt';

const SECRET = 'test-secret';

describe('jwt', () => {
  it('signs and verifies, returning id/iat/exp', async () => {
    const token = await signToken('user-1', SECRET);
    const payload = await verifyToken(token, SECRET);
    expect(payload.id).toBe('user-1');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
  });
  it('throws on a tampered token', async () => {
    const token = await signToken('user-1', SECRET);
    await expect(verifyToken(token + 'x', SECRET)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- jwt`

- [ ] **Step 3: Implement `api/src/lib/jwt.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from '../env';

const enc = new TextEncoder();

export async function signToken(id: string, secret: string): Promise<string> {
  // Pin iat so exp - iat === exactly 7 days (setIssuedAt() + setExpirationTime('7d')
  // capture "now" separately and can differ by 1s, making the expiry test flaky).
  const iat = Math.floor(Date.now() / 1000);
  return new SignJWT({ id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(iat + 7 * 24 * 60 * 60)
    .sign(enc.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, enc.encode(secret));
  return { id: payload.id as string, iat: payload.iat, exp: payload.exp };
}
```

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- jwt`

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/jwt.ts api/test/lib/jwt.test.ts
git commit -m "feat(api): jose-based JWT sign/verify (id/iat/exp, 7d)"
```

---

## Task 6: API-key generation + hashing

**Files:**
- Create: `api/src/lib/keys.ts`
- Test: `api/test/lib/keys.test.ts`
- Reference: `OLD: api/src/controllers/authController.js` (`genKey`)

**Interfaces:**
- Produces: `generateKey(): Promise<{ fullKey: string; keyHash: string; keyPrefix: string }>`, `hashKey(fullKey: string): Promise<string>` (SHA-256 hex), `keyPrefixOf(fullKey: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateKey, hashKey, keyPrefixOf } from '../../src/lib/keys';

describe('keys', () => {
  it('generates ak_live_ + 40 chars', async () => {
    const { fullKey } = await generateKey();
    expect(fullKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/);
  });
  it('prefix is the first 14 chars', async () => {
    const { fullKey, keyPrefix } = await generateKey();
    expect(keyPrefix).toBe(fullKey.slice(0, 14));
    expect(keyPrefix.startsWith('ak_live_')).toBe(true);
  });
  it('hashKey is a deterministic 64-char hex', async () => {
    const { fullKey, keyHash } = await generateKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashKey(fullKey)).toBe(keyHash);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- keys`

- [ ] **Step 3: Implement `api/src/lib/keys.ts`**

```ts
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomKeyBody(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let s = '';
  for (let i = 0; i < 40; i++) s += CHARS[bytes[i] % CHARS.length];
  return s;
}

export async function hashKey(fullKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullKey));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const keyPrefixOf = (fullKey: string): string => fullKey.slice(0, 14);

export async function generateKey() {
  const fullKey = `ak_live_${randomKeyBody()}`;
  return { fullKey, keyHash: await hashKey(fullKey), keyPrefix: keyPrefixOf(fullKey) };
}
```

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- keys`

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/keys.ts api/test/lib/keys.test.ts
git commit -m "feat(api): API-key generation with SHA-256 hash + prefix"
```

---

## Task 7: URL metadata fetch (fetch-based)

**Files:**
- Create: `api/src/lib/meta.ts`
- Test: `api/test/lib/meta.test.ts`
- Reference: `OLD: api/src/controllers/linkController.js` (`fetchPageMeta`, regex patterns, `decodeHtmlEntities`)

**Interfaces:**
- Produces: `fetchPageMeta(url: string): Promise<{ title: string; description: string }>`.

- [ ] **Step 1: Write the failing test** (stub global `fetch`)

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchPageMeta } from '../../src/lib/meta';

afterEach(() => vi.restoreAllMocks());

const html = `<html><head>
  <meta property="og:title" content="Hello &amp; World"/>
  <meta name="description" content="A description"/>
  <title>Fallback</title></head></html>`;

describe('fetchPageMeta', () => {
  it('extracts og:title (entity-decoded) and description', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(html, { status: 200 })));
    const meta = await fetchPageMeta('https://example.com');
    expect(meta.title).toBe('Hello & World');
    expect(meta.description).toBe('A description');
  });
  it('returns empty on network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net'); }));
    expect(await fetchPageMeta('https://example.com')).toEqual({ title: '', description: '' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- meta`

- [ ] **Step 3: Implement `api/src/lib/meta.ts`** (port the regex set + entity decode from OLD)

```ts
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_BYTES = 100_000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
}

function extract(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return decodeHtmlEntities(m[1].trim().replace(/\s+/g, ' '));
  }
  return '';
}

export async function fetchPageMeta(url: string): Promise<{ title: string; description: string }> {
  const empty = { title: '', description: '' };
  try {
    new URL(url);
  } catch {
    return empty;
  }
  try {
    const res = await fetch(url, {
      redirect: 'follow', // replaces OLD manual 5-hop redirect loop
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5', // parity with OLD
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !res.body) return empty;
    // Read at most MAX_BYTES
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); total += value.length;
    }
    reader.cancel().catch(() => {});
    const html = new TextDecoder().decode(concat(chunks).slice(0, MAX_BYTES));
    return {
      title: extract(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]),
      description: extract(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      ]),
    };
  } catch {
    return empty;
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
```

> **Intentional divergences from OLD `fetchPageMeta`:** OLD set `rejectUnauthorized:false` (accept invalid TLS) and did a manual 5-hop redirect loop — both are dropped: Workers `fetch` cannot disable TLS verification, and `redirect:'follow'` handles redirects. `Accept-Language` is preserved.
> SSRF: this fetches a user-supplied URL. Hardening (blocking internal ranges) is out of scope (spec §13) — note it in a `// SECURITY:` comment.

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- meta`

- [ ] **Step 5: Commit**

```bash
git add api/src/lib/meta.ts api/test/lib/meta.test.ts
git commit -m "feat(api): fetch-based URL metadata extraction (replaces Node http)"
```

---

## Task 8: Serializers + shared helpers (geo, time)

**Files:**
- Create: `api/src/lib/geo.ts`, `api/src/lib/time.ts`, `api/src/serializers/index.ts`
- Test: `api/test/serializers.test.ts`
- Reference: `OLD: linkController.js` (`COUNTRY_NAMES`, `parseDevice`), `OLD: authController.js` (`userPayload`), `OLD: apiKeyController.js` (`formatKey`)

**Interfaces:**
- Produces from `serializers/index.ts`: `serializeLink(row)`, `serializeRole(row, userCount?)`, `serializeLog(row)`, `userPayload(row)`, `userPayloadWithRoles(row, roles)`, `formatKey(row, user?)`. From `geo.ts`: `COUNTRY_NAMES`, `parseDevice(ua?)`. From `time.ts`: `nowIso()`, `last7Days(now)`.

- [ ] **Step 1: Write the failing test** `api/test/serializers.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { serializeLink, serializeRole, serializeLog, userPayload, formatKey } from '../src/serializers';

describe('serializers', () => {
  it('serializeLink exposes _id and camelCase, hides snake_case', () => {
    const row = { id: 'l1', code: 'abc', destinationUrl: 'https://x.com', title: 't', description: null,
      createdBy: 'u1', clickCount: 5, isActive: 1, expiresAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
    const out = serializeLink(row as any);
    expect(out._id).toBe('l1');
    expect(out).not.toHaveProperty('id');
    expect(out.isActive).toBe(true);
    expect(out.clickCount).toBe(5);
  });
  it('serializeRole includes userCount and parsed permissions', () => {
    const row = { id: 'r1', name: 'admin', description: '', permissions: '{"urls":{"view":true}}', createdAt: 'x', updatedAt: 'x' };
    const out = serializeRole(row as any, 3);
    expect(out._id).toBe('r1');
    expect(out.permissions).toEqual({ urls: { view: true } });
    expect(out.userCount).toBe(3);
  });
  it('formatKey returns id + keyPrefix, never a full key', () => {
    const row = { id: 'k1', keyName: 'Personal', keyPrefix: 'ak_live_abc123', scopes: '{"links":"read"}',
      status: 'active', expiresAt: null, lastUsedAt: null, createdAt: 'x' };
    const out = formatKey(row as any);
    expect(out.id).toBe('k1');
    expect(out.keyPrefix).toBe('ak_live_abc123');
    expect(out).not.toHaveProperty('keyHash');
  });
  it('userPayload returns id/email/fullName', () => {
    expect(userPayload({ id: 'u1', email: 'a@b.co', fullName: 'A' } as any)).toEqual({ id: 'u1', email: 'a@b.co', fullName: 'A' });
  });
  it('serializeLog exposes _id and camelCase userAgent', () => {
    const out = serializeLog({ id: 'g1', linkId: 'l1', ip: '1.2.3.4', userAgent: 'UA', referer: null, country: 'TH', city: null, createdAt: 'x' } as any);
    expect(out._id).toBe('g1');
    expect(out.userAgent).toBe('UA');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- serializers`

- [ ] **Step 3: Implement `api/src/lib/time.ts`**

```ts
export const nowIso = (): string => new Date().toISOString();

export function last7Days(now: Date): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}
```

- [ ] **Step 4: Implement `api/src/lib/geo.ts`** (copy `COUNTRY_NAMES` and `parseDevice` verbatim from OLD `linkController.js`)

```ts
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'USA', TH: 'Thailand', GB: 'United Kingdom', JP: 'Japan', CN: 'China',
  IN: 'India', DE: 'Germany', FR: 'France', AU: 'Australia', CA: 'Canada',
  SG: 'Singapore', KR: 'South Korea', BR: 'Brazil', MX: 'Mexico', ID: 'Indonesia',
  VN: 'Vietnam', MY: 'Malaysia', PH: 'Philippines', NL: 'Netherlands', IT: 'Italy',
  ES: 'Spain', RU: 'Russia', PL: 'Poland', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', CH: 'Switzerland', AT: 'Austria', BE: 'Belgium',
};

export function parseDevice(userAgent = ''): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('iphone')) os = 'iOS';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('mac os x') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge/')) browser = 'Edge';
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
  else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Firefox';
  else if (ua.includes('chrome') || ua.includes('crios')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  return `${browser} / ${os}`;
}
```

- [ ] **Step 5: Implement `api/src/serializers/index.ts`**

```ts
const boolOut = (n: number | boolean | null) => n === 1 || n === true;
const json = (s: string | null) => (s ? JSON.parse(s) : {});

export const serializeLink = (r: any) => ({
  _id: r.id,
  code: r.code,
  destinationUrl: r.destinationUrl,
  title: r.title ?? null,
  description: r.description ?? null,
  createdBy: r.createdBy ?? null,
  clickCount: r.clickCount,
  isActive: boolOut(r.isActive),
  expiresAt: r.expiresAt ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const serializeRole = (r: any, userCount?: number) => ({
  _id: r.id,
  name: r.name,
  description: r.description ?? '',
  permissions: json(r.permissions),
  ...(userCount !== undefined ? { userCount } : {}),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const serializeLog = (r: any) => ({
  _id: r.id,
  link: r.linkId,
  ip: r.ip ?? null,
  userAgent: r.userAgent ?? null,
  referer: r.referer ?? null,
  country: r.country ?? null,
  city: r.city ?? null,
  createdAt: r.createdAt,
});

export const userPayload = (u: any) => ({ id: u.id, email: u.email, fullName: u.fullName || '' });

export const userPayloadWithRoles = (u: any, roles: any[]) => ({
  ...userPayload(u),
  roles: roles.map((r) => ({ id: r.id, name: r.name, permissions: json(r.permissions) })),
});

export const formatKey = (k: any, user?: any) => ({
  id: k.id,
  keyName: k.keyName,
  keyPrefix: k.keyPrefix,
  scopes: json(k.scopes),
  status: k.status,
  expiresAt: k.expiresAt ?? null,
  lastUsedAt: k.lastUsedAt ?? null,
  createdAt: k.createdAt,
  user: user ? { id: user.id, email: user.email, fullName: user.fullName } : null, // OLD always emits user (null when absent)
});
```

> **Contract note:** the OLD `formatKey` returned `apiKey` (plaintext). Per spec §7.3 that becomes `keyPrefix`. The OLD `serializeLog` field for the FK was `link`; preserve that key name (mapped from `linkId`).

- [ ] **Step 6: Run — expect PASS.** `cd api && npm test -- serializers`

- [ ] **Step 7: Commit**

```bash
git add api/src/lib/geo.ts api/src/lib/time.ts api/src/serializers api/test/serializers.test.ts
git commit -m "feat(api): serializers + geo/time helpers (legacy _id/camelCase shapes)"
```

---

## Task 9: `auth` middleware (JWT + x-api-key)

**Files:**
- Create: `api/src/middleware/auth.ts`
- Test: `api/test/middleware/auth.test.ts`
- Reference: `OLD: api/src/middleware/auth.js`

**Interfaces:**
- Consumes: `verifyToken` (Task 5), `hashKey` (Task 6), `getDb` (Task 2), `fail` (Task 3).
- Produces: `auth` — a Hono middleware. On success calls `c.set('user', {...})`. On failure returns a `fail()` response (does not call `next`).

- [ ] **Step 1: Write the failing test** (seed a user + api key directly into D1)

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import { Hono } from 'hono';
import { auth } from '../../src/middleware/auth';
import { hashKey } from '../../src/lib/keys';
import { signToken } from '../../src/lib/jwt';
import type { AppBindings } from '../../src/env';

const app = new Hono<AppBindings>();
app.use('/protected', auth);
app.get('/protected', (c) => c.json({ user: c.get('user') }));

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('u1','a@b.co','h','Alice','free','active','x','x')").run();
  const fullKey = 'ak_live_' + 'a'.repeat(40);
  await env.DB.prepare("INSERT INTO api_keys (id,user_id,key_name,key_hash,key_prefix,scopes,status,is_personal,created_at,updated_at) VALUES ('k1','u1','Personal',?,?, '{}','active',1,'x','x')")
    .bind(await hashKey(fullKey), fullKey.slice(0,14)).run();
});

describe('auth middleware', () => {
  it('accepts a valid JWT and sets user.id', async () => {
    (env as any).JWT_SECRET = 'sec';
    const token = await signToken('u1', 'sec');
    const res = await app.request('/protected', { headers: { Authorization: `Bearer ${token}` } }, env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).user.id).toBe('u1');
  });
  it('accepts a valid x-api-key and sets user email/fullName', async () => {
    const res = await app.request('/protected', { headers: { 'x-api-key': 'ak_live_' + 'a'.repeat(40) } }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.user.email).toBe('a@b.co');
    expect(body.user.fullName).toBe('Alice');
  });
  it('rejects a missing token with AUTH_NO_TOKEN (401)', async () => {
    const res = await app.request('/protected', {}, env);
    expect(res.status).toBe(401);
    expect((await res.json() as any).errorCode).toBe('AUTH_NO_TOKEN');
  });
  it('rejects an unknown api key with AUTH_INVALID_API_KEY', async () => {
    const res = await app.request('/protected', { headers: { 'x-api-key': 'ak_live_' + 'z'.repeat(40) } }, env);
    expect((await res.json() as any).errorCode).toBe('AUTH_INVALID_API_KEY');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- middleware/auth`

- [ ] **Step 3: Implement `api/src/middleware/auth.ts`** (port OLD logic; hash lookup per spec §7.3/§8.1)

```ts
import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { apiKeys, users } from '../db/schema';
import { hashKey } from '../lib/keys';
import { verifyToken } from '../lib/jwt';
import { fail } from '../lib/errorCodes';
import { nowIso } from '../lib/time';

export const auth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const db = getDb(c.env);
  const apiKeyHeader = c.req.header('x-api-key');

  if (apiKeyHeader) {
    const hash = await hashKey(apiKeyHeader);
    const key = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).get();
    if (!key) return fail(c, 'AUTH_INVALID_API_KEY');
    if (key.status === 'revoked') return fail(c, 'AUTH_API_KEY_REVOKED');
    if (key.status === 'inactive') return fail(c, 'AUTH_API_KEY_INACTIVE');
    if (key.expiresAt && new Date() > new Date(key.expiresAt)) {
      await db.update(apiKeys).set({ status: 'expired' }).where(eq(apiKeys.id, key.id));
      return fail(c, 'AUTH_API_KEY_EXPIRED');
    }
    if (key.status === 'expired') return fail(c, 'AUTH_API_KEY_EXPIRED');
    // Fire-and-forget lastUsedAt update. The promise starts immediately; only the
    // waitUntil scheduling is guarded because c.executionCtx THROWS when no
    // ExecutionContext was provided (e.g. app.request(...) in tests without a ctx arg).
    const touch = db.update(apiKeys).set({ lastUsedAt: nowIso() }).where(eq(apiKeys.id, key.id)).then(() => {}, () => {});
    try { c.executionCtx.waitUntil(touch); } catch { /* no execution context (tests) */ }
    const u = await db.select().from(users).where(eq(users.id, key.userId)).get();
    c.set('user', { id: key.userId, email: u?.email, fullName: u?.fullName });
    return next();
  }

  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return fail(c, 'AUTH_NO_TOKEN');
  try {
    c.set('user', await verifyToken(token, c.env.JWT_SECRET));
    return next();
  } catch {
    return fail(c, 'AUTH_INVALID_TOKEN');
  }
};
```

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- middleware/auth`

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/auth.ts api/test/middleware/auth.test.ts
git commit -m "feat(api): auth middleware (JWT + hashed x-api-key)"
```

---

## Task 10: `checkPermission` middleware (ported, not wired)

**Files:**
- Create: `api/src/middleware/checkPermission.ts`
- Test: `api/test/middleware/checkPermission.test.ts`
- Reference: `OLD: api/src/middleware/checkPermission.js`

**Interfaces:**
- Consumes: `getDb`, `fail`, `c.get('user')`.
- Produces: `checkPermission(menu: string, action: string): MiddlewareHandler` — passes if any of the user's roles grants `permissions[menu][action] === true`, else `FORBIDDEN`.

- [ ] **Step 1: Write the failing test**

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import { Hono } from 'hono';
import { checkPermission } from '../../src/middleware/checkPermission';
import type { AppBindings } from '../../src/env';

const app = new Hono<AppBindings>();
app.use('*', async (c, next) => { c.set('user', { id: 'u1' }); return next(); });
app.get('/urls', checkPermission('urls', 'view'), (c) => c.json({ ok: true }));
app.get('/secret', checkPermission('admin', 'view'), (c) => c.json({ ok: true }));

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO roles (id,name,description,permissions,created_at,updated_at) VALUES ('r1','viewer','','{\"urls\":{\"view\":true}}','x','x')").run();
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('u1','p@b.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO user_roles (user_id,role_id) VALUES ('u1','r1')").run();
});

describe('checkPermission', () => {
  it('allows when a role grants the permission', async () => {
    const res = await app.request('/urls', {}, env);
    expect(res.status).toBe(200);
  });
  it('forbids when no role grants it', async () => {
    const res = await app.request('/secret', {}, env);
    expect(res.status).toBe(403);
    expect((await res.json() as any).errorCode).toBe('FORBIDDEN');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- checkPermission`

- [ ] **Step 3: Implement `api/src/middleware/checkPermission.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { roles, userRoles } from '../db/schema';
import { fail } from '../lib/errorCodes';

export const checkPermission = (menu: string, action: string): MiddlewareHandler<AppBindings> => async (c, next) => {
  const user = c.get('user');
  if (!user?.id) return fail(c, 'AUTH_INVALID_TOKEN');
  const db = getDb(c.env);
  const rows = await db
    .select({ permissions: roles.permissions })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id))
    .all();
  const allowed = rows.some((r) => {
    try { return JSON.parse(r.permissions)?.[menu]?.[action] === true; } catch { return false; }
  });
  if (!allowed) return fail(c, 'FORBIDDEN');
  return next();
};
```

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- checkPermission`

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/checkPermission.ts api/test/middleware/checkPermission.test.ts
git commit -m "feat(api): port checkPermission middleware (RBAC, not yet wired)"
```

---

## Task 11: Auth routes + controller

**Files:**
- Create: `api/src/controllers/authController.ts`, `api/src/routes/auth.ts`
- Modify: `api/src/app.ts` (mount auth router)
- Test: `api/test/routes/auth.test.ts`
- Reference: `OLD: api/src/controllers/authController.js`, `OLD: api/src/routes/auth.js`

**Interfaces:**
- Consumes: `getDb`, serializers (`userPayload`, `userPayloadWithRoles`, `formatKey`), `hashPassword`/`verifyPassword`, `signToken`, `generateKey`, `auth` middleware, `ok`/`fail`.
- Produces: handlers `register, login, me, updateProfile, changePassword, getApiKey, regenerateApiKey`; router mounted at `/api/v1/auth`.

- [ ] **Step 1: Write failing tests** `api/test/routes/auth.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';

beforeAll(() => { (env as any).JWT_SECRET = 'sec'; });

const json = (body: any, headers: any = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('auth routes', () => {
  it('register returns token + user (201) and hashes password', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'New@X.com', password: 'pw123456' }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.user.email).toBe('new@x.com'); // lowercased
    expect(body.user).not.toHaveProperty('password');
  });
  it('register with duplicate email → AUTH_EMAIL_EXISTS', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'dup@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/register', json({ email: 'dup@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('AUTH_EMAIL_EXISTS');
  });
  it('register missing fields → AUTH_MISSING_FIELDS', async () => {
    const res = await app.request('/api/v1/auth/register', json({ email: 'x@x.com' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('login with correct creds returns token', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'log@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log@x.com', password: 'pw123456' }), env);
    expect(res.status).toBe(200);
    expect((await res.json() as any).token).toBeTruthy();
  });
  it('login wrong password → AUTH_INVALID_CREDENTIALS', async () => {
    await app.request('/api/v1/auth/register', json({ email: 'log2@x.com', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/auth/login', json({ email: 'log2@x.com', password: 'nope' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });
  it('regenerate then getApiKey returns prefix only (no full key)', async () => {
    const reg = await app.request('/api/v1/auth/register', json({ email: 'key@x.com', password: 'pw123456' }), env);
    const token = (await reg.json() as any).token;
    const gen = await app.request('/api/v1/auth/api-key/regenerate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, env);
    const genBody = await gen.json() as any;
    expect(genBody.apiKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/); // full key shown once
    const get = await app.request('/api/v1/auth/api-key', { headers: { Authorization: `Bearer ${token}` } }, env);
    const getBody = await get.json() as any;
    expect(getBody.hasKey).toBe(true);
    expect(getBody.keyPrefix).toBe(genBody.keyPrefix);
    expect(getBody).not.toHaveProperty('apiKey');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- routes/auth`

- [ ] **Step 3: Implement `api/src/controllers/authController.ts`** (port behavior from OLD)

```ts
import type { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { users, roles, userRoles, apiKeys } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import { generateKey } from '../lib/keys';
import { userPayload, userPayloadWithRoles } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();

export const register = async (c: C) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(users).values({ id, email: String(email).toLowerCase(), password: await hashPassword(password), fullName: '', accountType: 'free', status: 'active', createdAt: now, updatedAt: now });
  } catch (e: any) {
    if (String(e?.message || e).includes('UNIQUE constraint failed')) return fail(c, 'AUTH_EMAIL_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const token = await signToken(id, c.env.JWT_SECRET);
  return ok(c, { token, user: userPayload({ id, email: String(email).toLowerCase(), fullName: '' }) }, 201);
};

export const login = async (c: C) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  const db = getDb(c.env);
  const u = await db.select().from(users).where(eq(users.email, String(email).toLowerCase())).get();
  if (!u || !(await verifyPassword(password, u.password))) return fail(c, 'AUTH_INVALID_CREDENTIALS');
  if (u.status === 'inactive') return fail(c, 'AUTH_ACCOUNT_INACTIVE');
  if (u.status === 'suspended') return fail(c, 'AUTH_ACCOUNT_SUSPENDED');
  if (u.status === 'pending_verification') return fail(c, 'AUTH_ACCOUNT_PENDING');
  const token = await signToken(u.id, c.env.JWT_SECRET);
  return ok(c, { token, user: userPayload(u) });
};

export const me = async (c: C) => {
  const db = getDb(c.env);
  const u = await db.select().from(users).where(eq(users.id, c.get('user').id)).get();
  if (!u) return fail(c, 'SERVER_ERROR');
  const rs = await db.select({ id: roles.id, name: roles.name, permissions: roles.permissions })
    .from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, u.id)).all();
  return ok(c, { user: userPayloadWithRoles(u, rs) });
};

export const updateProfile = async (c: C) => {
  const { fullName } = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const id = c.get('user').id;
  await db.update(users).set({ fullName: (fullName ?? '').trim(), updatedAt: nowIso() }).where(eq(users.id, id));
  const u = await db.select().from(users).where(eq(users.id, id)).get();
  return ok(c, { user: userPayload(u) });
};

export const changePassword = async (c: C) => {
  const { currentPassword, newPassword } = await c.req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) return fail(c, 'AUTH_MISSING_PW_FIELDS');
  if (newPassword.length < 6) return fail(c, 'AUTH_WEAK_PASSWORD');
  const db = getDb(c.env);
  const id = c.get('user').id;
  const u = await db.select().from(users).where(eq(users.id, id)).get();
  if (!u || !(await verifyPassword(currentPassword, u.password))) return fail(c, 'AUTH_WRONG_PASSWORD');
  await db.update(users).set({ password: await hashPassword(newPassword), updatedAt: nowIso() }).where(eq(users.id, id));
  return ok(c, { message: 'Password updated successfully' });
};

export const getApiKey = async (c: C) => {
  const db = getDb(c.env);
  const k = await db.select().from(apiKeys).where(eq(apiKeys.userId, c.get('user').id)).orderBy(desc(apiKeys.createdAt)).get();
  if (!k) return ok(c, { hasKey: false });
  return ok(c, { hasKey: true, keyId: k.id, keyPrefix: k.keyPrefix, apiKeyStatus: k.status, apiKeyExpiresAt: k.expiresAt });
};

export const regenerateApiKey = async (c: C) => {
  const db = getDb(c.env);
  const userId = c.get('user').id;
  await db.delete(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isPersonal, 1)));
  const { fullKey, keyHash, keyPrefix } = await generateKey();
  const id = uuid(); const now = nowIso();
  await db.insert(apiKeys).values({ id, userId, keyName: 'Personal', keyHash, keyPrefix, scopes: JSON.stringify({ links: 'write', stats: 'read' }), status: 'active', isPersonal: 1, expiresAt: null, lastUsedAt: null, createdAt: now, updatedAt: now });
  return ok(c, { keyId: id, apiKey: fullKey, keyPrefix, apiKeyStatus: 'active', apiKeyExpiresAt: null });
};
```

- [ ] **Step 4: Implement `api/src/routes/auth.ts`**

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/authController';

export const authRoutes = new Hono<AppBindings>();
authRoutes.post('/register', ctrl.register);
authRoutes.post('/login', ctrl.login);
authRoutes.get('/me', auth, ctrl.me);
authRoutes.put('/profile', auth, ctrl.updateProfile);
authRoutes.put('/change-password', auth, ctrl.changePassword);
authRoutes.get('/api-key', auth, ctrl.getApiKey);
authRoutes.post('/api-key/regenerate', auth, ctrl.regenerateApiKey);
```

- [ ] **Step 5: Mount in `api/src/app.ts`** — add after the health route:

```ts
import { authRoutes } from './routes/auth';
app.route('/api/v1/auth', authRoutes);
```

- [ ] **Step 6: Run — expect PASS.** `cd api && npm test -- routes/auth`

- [ ] **Step 7: Commit**

```bash
git add api/src/controllers/authController.ts api/src/routes/auth.ts api/src/app.ts api/test/routes/auth.test.ts
git commit -m "feat(api): auth routes (register/login/me/profile/password/api-key)"
```

---

## Task 12: Links routes + controller (CRUD + shorten)

**Files:**
- Create: `api/src/controllers/linkController.ts`, `api/src/routes/links.ts`
- Modify: `api/src/app.ts` (mount links router + `POST /api/v1/shorten`)
- Test: `api/test/routes/links.test.ts`
- Reference: `OLD: api/src/controllers/linkController.js` (getLinks/createLink/updateLink/deleteLink/getLinkByCode), `OLD: api/src/routes/links.js`

**Interfaces:**
- Consumes: `getDb`, `serializeLink`, `fetchPageMeta`, `auth`, `nanoid`, `ok`/`fail`, `c.env.BASE_SHORT_URL`.
- Produces: handlers `getLinks, createLink, updateLink, deleteLink, getLinkByCode` (+ analytics handlers added in Task 13); router at `/api/v1/links`; `createLink` also mounted at `POST /api/v1/shorten`.

> **`deleteLink` id-or-code disambiguation:** the controller (Step 3) uses a UUID-shape test `const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)` to decide whether the param is a link `id` (UUID) or a `code`. Tests exercise the code path with `delme` (non-UUID).

- [ ] **Step 1: Write failing tests** `api/test/routes/links.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect, vi } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  (env as any).BASE_SHORT_URL = 'https://blly.to';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('lu','l@x.co','h','','free','active','x','x')").run();
  token = await signToken('lu', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('links routes', () => {
  it('createLink generates a 7-char code and shortUrl from BASE_SHORT_URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<title>T</title>', { status: 200 })));
    const res = await app.request('/api/v1/links', post({ destinationUrl: 'https://example.com', title: 'My', description: 'D' }), env);
    expect(res.status).toBe(201);
    const b = await res.json() as any;
    expect(b.code).toHaveLength(7);
    expect(b.shortUrl).toBe(`https://blly.to/${b.code}`);
  });
  it('createLink missing url → LINK_MISSING_URL', async () => {
    const res = await app.request('/api/v1/links', post({}), env);
    expect((await res.json() as any).errorCode).toBe('LINK_MISSING_URL');
  });
  it('createLink with duplicate custom code → LINK_CODE_EXISTS', async () => {
    await app.request('/api/v1/links', post({ destinationUrl: 'https://a.com', code: 'dupcode', title: 't', description: 'd' }), env);
    const res = await app.request('/api/v1/links', post({ destinationUrl: 'https://b.com', code: 'dupcode', title: 't', description: 'd' }), env);
    expect((await res.json() as any).errorCode).toBe('LINK_CODE_EXISTS');
  });
  it('getLinks returns the user links with _id', async () => {
    const res = await app.request('/api/v1/links', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(Array.isArray(b.data)).toBe(true);
    expect(b.data[0]).toHaveProperty('_id');
    expect(b.data[0]).toHaveProperty('isActive');
  });
  it('shorten endpoint maps to createLink', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<title>T</title>', { status: 200 })));
    const res = await app.request('/api/v1/shorten', post({ destinationUrl: 'https://ex2.com', title: 't', description: 'd' }), env);
    expect(res.status).toBe(201);
  });
  it('deleteLink by code (non-uuid) removes it', async () => {
    await app.request('/api/v1/links', post({ destinationUrl: 'https://del.com', code: 'delme', title: 't', description: 'd' }), env);
    const res = await app.request('/api/v1/links/delme', { method: 'DELETE', headers: authH() }, env);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- routes/links`

- [ ] **Step 3: Implement `api/src/controllers/linkController.ts`** (CRUD + shorten; analytics added next task)

```ts
import type { Context } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { links, redirectLogs } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { fetchPageMeta } from '../lib/meta';
import { serializeLink } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

export const getLinks = async (c: C) => {
  const db = getDb(c.env);
  const rows = await db.select().from(links).where(eq(links.createdBy, c.get('user').id)).orderBy(desc(links.createdAt)).all();
  return ok(c, { data: rows.map(serializeLink) });
};

export const createLink = async (c: C) => {
  const body = await c.req.json().catch(() => ({}));
  const { destinationUrl, code, expiresAt } = body;
  let { title, description } = body;
  if (!destinationUrl) return fail(c, 'LINK_MISSING_URL');
  if (!title?.trim() || !description?.trim()) {
    const meta = await fetchPageMeta(destinationUrl);
    if (!title?.trim()) title = meta.title;
    if (!description?.trim()) description = meta.description;
  }
  const shortCode = code?.trim() || nanoid(7);
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(links).values({ id, code: shortCode, destinationUrl, title: title || null, description: description || null, expiresAt: expiresAt || null, createdBy: c.get('user').id, clickCount: 0, isActive: 1, createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'LINK_CODE_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  return ok(c, {
    code: shortCode,
    destinationUrl,
    shortUrl: `${c.env.BASE_SHORT_URL.replace(/\/$/, '')}/${shortCode}`,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  }, 201);
};

export const updateLink = async (c: C) => {
  const body = await c.req.json().catch(() => ({}));
  const { title, description, destinationUrl, code, isActive, expiresAt } = body;
  // Guard each field: only write provided keys (destinationUrl is NOT NULL — never overwrite with undefined).
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (title !== undefined) set.title = title;
  if (description !== undefined) set.description = description;
  if (destinationUrl !== undefined) set.destinationUrl = destinationUrl;
  if (expiresAt !== undefined) set.expiresAt = expiresAt || null;
  if (typeof isActive === 'boolean') set.isActive = isActive ? 1 : 0;
  if (code?.trim()) set.code = code.trim();
  const db = getDb(c.env);
  try {
    const updated = await db.update(links).set(set).where(eq(links.id, c.req.param('id'))).returning().get();
    if (!updated) return fail(c, 'LINK_NOT_FOUND');
    return ok(c, { data: serializeLink(updated) });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'LINK_CODE_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
};

export const deleteLink = async (c: C) => {
  const ref = c.req.param('id');
  const db = getDb(c.env);
  const row = isUuid(ref)
    ? await db.select().from(links).where(eq(links.id, ref)).get()
    : await db.select().from(links).where(and(eq(links.code, ref), eq(links.createdBy, c.get('user').id))).get();
  if (!row) return fail(c, 'LINK_NOT_FOUND');
  await db.delete(links).where(eq(links.id, row.id)); // redirect_logs cascade via FK
  return ok(c, { message: 'Link deleted successfully' });
};

export const getLinkByCode = async (c: C) => {
  const db = getDb(c.env);
  const row = await db.select().from(links).where(and(eq(links.code, c.req.param('code')), eq(links.createdBy, c.get('user').id))).get();
  if (!row) return fail(c, 'LINK_NOT_FOUND');
  return ok(c, { data: serializeLink(row) });
};
```

- [ ] **Step 4: Implement `api/src/routes/links.ts`** (analytics routes are added in Task 13; declare them now pointing at handlers created there, OR add this file in Task 13. To keep this task self-contained, register only the handlers that exist now and add the analytics routes in Task 13.)

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/linkController';

export const linkRoutes = new Hono<AppBindings>();
linkRoutes.use('*', auth);
linkRoutes.get('/', ctrl.getLinks);
linkRoutes.post('/', ctrl.createLink);
linkRoutes.get('/code/:code', ctrl.getLinkByCode);
linkRoutes.put('/:id', ctrl.updateLink);
linkRoutes.delete('/:id', ctrl.deleteLink);
// analytics + logs routes are added in Task 13, which REWRITES this whole file with the final route order.
```

> **Provisional file:** this router is replaced in full by Task 13 Step 4 (which adds `/analytics`, `/meta`, `/:id/logs`, `/:id/analytics` in the correct order). Task 12's tests only exercise the routes above, so this subset passes Task 12 on its own.

- [ ] **Step 5: Mount in `api/src/app.ts`**

```ts
import { linkRoutes } from './routes/links';
import { createLink } from './controllers/linkController';
import { auth } from './middleware/auth';
app.route('/api/v1/links', linkRoutes);
app.post('/api/v1/shorten', auth, createLink);
```

- [ ] **Step 6: Run — expect PASS.** `cd api && npm test -- routes/links`

- [ ] **Step 7: Commit**

```bash
git add api/src/controllers/linkController.ts api/src/routes/links.ts api/src/app.ts api/test/routes/links.test.ts
git commit -m "feat(api): link CRUD + shorten (code gen, meta fetch, id-or-code delete)"
```

---

## Task 13: Links analytics + logs

**Files:**
- Modify: `api/src/controllers/linkController.ts` (add `getLogs, getAnalytics, getLinkAnalytics`), `api/src/routes/links.ts` (add routes), `api/src/app.ts` if needed
- Test: `api/test/routes/links-analytics.test.ts`
- Reference: `OLD: linkController.js` (getLogs/getAnalytics/getLinkAnalytics — match the exact response shapes incl. `qrScans:0`, `trafficType`, `locations`)

**Interfaces:**
- Consumes: `getDb`, `serializeLog`, `parseDevice`, `COUNTRY_NAMES`, `last7Days`.
- Produces: handlers `getLogs, getAnalytics, getLinkAnalytics`. Response shapes per spec §9 / OLD controller (timeline `{date,clicks,qrScans?,linksCreated?}`, `devices [{name,count}]`, `trafficType {direct,qr,referral}`, `locations {countries,cities}` with `{name,count,percent}` top-10).

> **Geo data source change (not in OLD):** OLD `getAnalytics`/`getLinkAnalytics` compute country/city at READ time via `geoip.lookup(log.ip)` (OLD has no country/city columns). The new design reads the `redirect_logs.country`/`city` columns populated from `request.cf` at redirect time (Task 17). The **output shape is preserved** (`countries`/`cities` `[{name,count,percent}]` + `COUNTRY_NAMES` mapping); only the data source differs. So "match OLD" here means match the OLD response shape, not its read-time lookup.

- [ ] **Step 1: Write failing tests** `api/test/routes/links-analytics.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('au','an@x.co','h','','free','active','2026-06-10T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('al1','aco','https://x.com','au',2,1,'2026-06-18T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO redirect_logs (id,link_id,ip,user_agent,referer,country,city,created_at) VALUES ('g1','al1','1.1.1.1','Mozilla Windows Chrome',NULL,'TH','Bangkok','2026-06-18T10:00:00Z')").run();
  await env.DB.prepare("INSERT INTO redirect_logs (id,link_id,ip,user_agent,referer,country,city,created_at) VALUES ('g2','al1','2.2.2.2','iPhone Safari','https://t.co','US','NY','2026-06-18T11:00:00Z')").run();
  token = await signToken('au', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });

describe('links analytics', () => {
  it('getAnalytics returns stats/timeline/devices/trafficType/locations', async () => {
    const res = await app.request('/api/v1/links/analytics', { headers: authH() }, env);
    expect(res.status).toBe(200);
    const b = await res.json() as any;
    expect(b.stats).toMatchObject({ totalLinks: 1, totalClicks: 2, qrScans: 0 });
    expect(Array.isArray(b.timeline)).toBe(true);
    expect(b.timeline).toHaveLength(7);
    expect(b.trafficType).toMatchObject({ direct: 1, qr: 0, referral: 1 });
    expect(b.locations.countries.find((x: any) => x.name === 'Thailand')).toBeTruthy();
    expect(b.locations.cities.find((x: any) => x.name === 'Bangkok')).toBeTruthy();
  });
  it('getLogs returns logs with _id and userAgent', async () => {
    const res = await app.request('/api/v1/links/al1/logs', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data[0]).toHaveProperty('_id');
    expect(b.data[0]).toHaveProperty('userAgent');
  });
  it('getLinkAnalytics returns link header + timeline', async () => {
    const res = await app.request('/api/v1/links/al1/analytics', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.link).toMatchObject({ code: 'aco', totalClicks: 2 });
    expect(b.timeline).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- links-analytics`

- [ ] **Step 3: Add handlers to `api/src/controllers/linkController.ts`** (append; import additions: `inArray`, `gte` from drizzle-orm; `serializeLog`, `parseDevice`, `COUNTRY_NAMES`, `last7Days`)

```ts
import { inArray, gte } from 'drizzle-orm';
import { serializeLog } from '../serializers';
import { parseDevice, COUNTRY_NAMES } from '../lib/geo';
import { last7Days } from '../lib/time';

const sevenDaysAgoIso = (now: Date) => new Date(now.getTime() - 7 * 864e5).toISOString();
const dayOf = (iso: string) => iso.split('T')[0];

export const getLogs = async (c: C) => {
  const db = getDb(c.env);
  const rows = await db.select().from(redirectLogs).where(eq(redirectLogs.linkId, c.req.param('id'))).orderBy(desc(redirectLogs.createdAt)).limit(200).all();
  return ok(c, { data: rows.map(serializeLog) });
};

function buildAnalytics(linkRows: any[], logs: any[], now: Date) {
  const days = last7Days(now);
  const timeline = days.map((date) => ({
    date,
    clicks: logs.filter((l) => dayOf(l.createdAt) === date).length,
    qrScans: 0,
    linksCreated: linkRows.filter((l) => dayOf(l.createdAt) === date).length,
  }));
  const deviceMap: Record<string, number> = {};
  for (const l of logs) { const d = parseDevice(l.userAgent); deviceMap[d] = (deviceMap[d] || 0) + 1; }
  const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const direct = logs.filter((l) => !l.referer).length;
  const referral = logs.filter((l) => !!l.referer).length;
  const countryMap: Record<string, number> = {}; const cityMap: Record<string, number> = {};
  for (const l of logs) {
    if (l.country) { const cn = COUNTRY_NAMES[l.country] || l.country; countryMap[cn] = (countryMap[cn] || 0) + 1; }
    if (l.city) cityMap[l.city] = (cityMap[l.city] || 0) + 1;
  }
  const total = Math.max(logs.length, 1);
  const top = (m: Record<string, number>) => Object.entries(m).map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count).slice(0, 10);
  return { timeline, devices, trafficType: { direct, qr: 0, referral }, locations: { countries: top(countryMap), cities: top(cityMap) } };
}

export const getAnalytics = async (c: C) => {
  const db = getDb(c.env);
  const now = new Date();
  const linkRows = await db.select().from(links).where(eq(links.createdBy, c.get('user').id)).all();
  const ids = linkRows.map((l) => l.id);
  const logs = ids.length
    ? await db.select().from(redirectLogs).where(and(inArray(redirectLogs.linkId, ids), gte(redirectLogs.createdAt, sevenDaysAgoIso(now)))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all()
    : [];
  const totalClicks = linkRows.reduce((s, l) => s + l.clickCount, 0);
  const activeLinks = linkRows.filter((l) => l.isActive === 1 && (!l.expiresAt || new Date(l.expiresAt) > now)).length;
  const a = buildAnalytics(linkRows, logs, now);
  return ok(c, { stats: { totalLinks: linkRows.length, activeLinks, totalClicks, qrScans: 0 }, ...a, lastUpdated: now.toISOString() });
};

export const getLinkAnalytics = async (c: C) => {
  const db = getDb(c.env);
  const now = new Date();
  const link = await db.select().from(links).where(eq(links.id, c.req.param('id'))).get();
  if (!link) return fail(c, 'LINK_NOT_FOUND');
  const logs = await db.select().from(redirectLogs).where(and(eq(redirectLogs.linkId, link.id), gte(redirectLogs.createdAt, sevenDaysAgoIso(now)))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all();
  const a = buildAnalytics([], logs, now);
  return ok(c, {
    link: { code: link.code, title: link.title, totalClicks: link.clickCount, createdAt: link.createdAt },
    timeline: a.timeline.map(({ date, clicks }) => ({ date, clicks })),
    devices: a.devices, trafficType: a.trafficType, locations: a.locations,
  });
};
```

> Match OLD shapes exactly: `getAnalytics.timeline` items include `qrScans:0` and `linksCreated`; `getLinkAnalytics.timeline` items are `{date,clicks}` only. `stats.qrScans` and `trafficType.qr` are hardcoded `0`.

- [ ] **Step 4: Rewrite `api/src/routes/links.ts` completely** (full file, replacing Task 12's version — correct, deterministic route order; mirrors OLD `routes/links.js`)

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/linkController';
import { fetchPageMeta } from '../lib/meta';

export const linkRoutes = new Hono<AppBindings>();
linkRoutes.use('*', auth);
// Literal GET routes first (so they are never shadowed by a future single-segment :param GET):
linkRoutes.get('/analytics', ctrl.getAnalytics);
linkRoutes.get('/meta', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ success: true, title: '', description: '' });
  try { new URL(url); } catch { return c.json({ success: true, title: '', description: '' }); }
  const meta = await fetchPageMeta(url);
  return c.json({ success: true, ...meta }); // OLD ok(res, meta) → { success:true, title, description }
});
linkRoutes.get('/', ctrl.getLinks);
linkRoutes.post('/', ctrl.createLink);
linkRoutes.get('/code/:code', ctrl.getLinkByCode);
linkRoutes.put('/:id', ctrl.updateLink);
linkRoutes.delete('/:id', ctrl.deleteLink);
linkRoutes.get('/:id/logs', ctrl.getLogs);
linkRoutes.get('/:id/analytics', ctrl.getLinkAnalytics);
```

> This is the canonical final router. `GET /analytics` and `GET /meta` are declared before `GET /` and the `/:id/*` routes; there is no `GET /:id` single-segment route to collide with, so the order is safe. (The mount in Task 12 Step 5 — `app.route('/api/v1/links', linkRoutes)` — is unchanged.)

- [ ] **Step 5: Run — expect PASS.** `cd api && npm test -- links-analytics`

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/linkController.ts api/src/routes/links.ts api/test/routes/links-analytics.test.ts
git commit -m "feat(api): link analytics + logs (timeline/devices/geo/trafficType)"
```

---

## Task 14: Users routes + controller

**Files:**
- Create: `api/src/controllers/userController.ts`, `api/src/routes/users.ts`
- Modify: `api/src/app.ts`
- Test: `api/test/routes/users.test.ts`
- Reference: `OLD: api/src/controllers/userController.js`, `OLD: routes/users.js`

**Interfaces:**
- Consumes: `getDb`, `hashPassword`, `auth`, `ok`/`fail`. (Note: the users payload is RICHER than the auth `userPayload` — defined locally here.)
- Produces: handlers `getUsers, createUser, updateUser, deleteUser`; router at `/api/v1/users`. The admin user payload is `{ id, fullName, email, accountType, status, roles:[{id,name}], createdAt }`. List defaults `page=1, limit=10`; returns `{ data, pagination:{total,page,limit,pages} }`.

- [ ] **Step 1: Write failing tests** `api/test/routes/users.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('admin','admin@x.co','h','Admin','enterprise','active','2026-06-01T00:00:00Z','x')").run();
  await env.DB.prepare("INSERT INTO roles (id,name,description,permissions,created_at,updated_at) VALUES ('rr','editor','','{}','x','x')").run();
  token = await signToken('admin', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('users routes', () => {
  it('list returns {data,pagination} with id (not _id) and roles', async () => {
    const res = await app.request('/api/v1/users', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data[0]).toHaveProperty('id');
    expect(b.data[0]).toHaveProperty('accountType');
    expect(Array.isArray(b.data[0].roles)).toBe(true);
    expect(b.pagination).toMatchObject({ page: 1, limit: 10 });
    expect(typeof b.pagination.total).toBe('number');
  });
  it('search filters by email substring', async () => {
    await app.request('/api/v1/users', post({ email: 'findme@x.co', password: 'pw123456' }), env);
    const res = await app.request('/api/v1/users?search=findme', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.data.every((u: any) => u.email.includes('findme'))).toBe(true);
  });
  it('create hashes password, attaches roles, rejects duplicate email', async () => {
    const r1 = await app.request('/api/v1/users', post({ email: 'dupu@x.co', password: 'pw123456', roles: ['rr'] }), env);
    expect(r1.status).toBe(201);
    expect((await r1.json() as any).data.roles[0]).toMatchObject({ id: 'rr', name: 'editor' });
    const r2 = await app.request('/api/v1/users', post({ email: 'dupu@x.co', password: 'pw123456' }), env);
    expect((await r2.json() as any).errorCode).toBe('AUTH_EMAIL_EXISTS');
  });
  it('create missing fields → AUTH_MISSING_FIELDS', async () => {
    const res = await app.request('/api/v1/users', post({ email: 'x@x.co' }), env);
    expect((await res.json() as any).errorCode).toBe('AUTH_MISSING_FIELDS');
  });
  it('update changes status + roles; delete removes the user', async () => {
    const c = await app.request('/api/v1/users', post({ email: 'upd@x.co', password: 'pw123456' }), env);
    const id = (await c.json() as any).data.id;
    const u = await app.request(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify({ status: 'suspended', roles: ['rr'] }) }, env);
    const ub = await u.json() as any;
    expect(ub.data.status).toBe('suspended');
    expect(ub.data.roles[0].id).toBe('rr');
    const d = await app.request(`/api/v1/users/${id}`, { method: 'DELETE', headers: authH() }, env);
    expect(d.status).toBe(200);
    const g = await app.request(`/api/v1/users/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect((await g.json() as any).errorCode).toBe('USER_NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- routes/users`

- [ ] **Step 3: Implement `api/src/controllers/userController.ts`**

```ts
import type { Context } from 'hono';
import { eq, and, or, like, desc, inArray, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb, type DB } from '../db/client';
import { users, roles, userRoles } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { hashPassword } from '../lib/password';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

const toUserAdmin = (u: any, roleList: { id: string; name: string }[]) => ({
  id: u.id, fullName: u.fullName || '', email: u.email,
  accountType: u.accountType, status: u.status, roles: roleList, createdAt: u.createdAt,
});

async function rolesByUser(db: DB, userIds: string[]) {
  const map = new Map<string, { id: string; name: string }[]>();
  if (!userIds.length) return map;
  const rows = await db.select({ userId: userRoles.userId, id: roles.id, name: roles.name })
    .from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, userIds)).all();
  for (const r of rows) { const a = map.get(r.userId) || []; a.push({ id: r.id, name: r.name }); map.set(r.userId, a); }
  return map;
}

export const getUsers = async (c: C) => {
  const db = getDb(c.env);
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 10);
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const conds = [] as any[];
  if (search) conds.push(or(like(users.fullName, `%${search}%`), like(users.email, `%${search}%`)));
  if (status) conds.push(eq(users.status, status));
  const where = conds.length ? and(...conds) : undefined;
  const totalRow = await db.select({ n: sql<number>`count(*)` }).from(users).where(where).get();
  const total = totalRow?.n ?? 0;
  const rows = await db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset((page - 1) * limit).all();
  const map = await rolesByUser(db, rows.map((r) => r.id));
  return ok(c, { data: rows.map((u) => toUserAdmin(u, map.get(u.id) || [])), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
};

export const createUser = async (c: C) => {
  const { email, password, fullName, accountType, status, roles: roleIds } = await c.req.json().catch(() => ({}));
  if (!email || !password) return fail(c, 'AUTH_MISSING_FIELDS');
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso(); const lower = String(email).toLowerCase();
  try {
    await db.insert(users).values({ id, email: lower, password: await hashPassword(password), fullName: fullName || '', accountType: accountType || 'free', status: status || 'active', createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'AUTH_EMAIL_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const list: { id: string; name: string }[] = [];
  for (const rid of (roleIds || [])) {
    await db.insert(userRoles).values({ userId: id, roleId: rid });
    const r = await db.select({ id: roles.id, name: roles.name }).from(roles).where(eq(roles.id, rid)).get();
    if (r) list.push(r);
  }
  return ok(c, { data: toUserAdmin({ id, email: lower, fullName: fullName || '', accountType: accountType || 'free', status: status || 'active', createdAt: now }, list) }, 201);
};

export const updateUser = async (c: C) => {
  const { fullName, accountType, status, email, roles: roleIds } = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const id = c.req.param('id');
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (fullName !== undefined) set.fullName = fullName;
  if (accountType !== undefined) set.accountType = accountType;
  if (status !== undefined) set.status = status;
  if (email !== undefined) set.email = String(email).toLowerCase();
  const updated = await db.update(users).set(set).where(eq(users.id, id)).returning().get();
  if (!updated) return fail(c, 'USER_NOT_FOUND');
  if (roleIds !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    for (const rid of roleIds) await db.insert(userRoles).values({ userId: id, roleId: rid });
  }
  const map = await rolesByUser(db, [id]);
  return ok(c, { data: toUserAdmin(updated, map.get(id) || []) });
};

export const deleteUser = async (c: C) => {
  const db = getDb(c.env);
  const deleted = await db.delete(users).where(eq(users.id, c.req.param('id'))).returning().get();
  if (!deleted) return fail(c, 'USER_NOT_FOUND');
  return ok(c, { message: 'User deleted successfully' });
};
```

- [ ] **Step 4: Implement `api/src/routes/users.ts`** + mount in `app.ts`

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/userController';

export const userRoutes = new Hono<AppBindings>();
userRoutes.use('*', auth);
userRoutes.get('/', ctrl.getUsers);
userRoutes.post('/', ctrl.createUser);
userRoutes.put('/:id', ctrl.updateUser);
userRoutes.delete('/:id', ctrl.deleteUser);
```
In `app.ts`: `import { userRoutes } from './routes/users'; app.route('/api/v1/users', userRoutes);`

- [ ] **Step 5: Run — expect PASS.** `cd api && npm test -- routes/users`
- [ ] **Step 6: Commit** `git commit -m "feat(api): users routes (list search/pagination + roles, CRUD)"`

---

## Task 15: Roles routes + controller

**Files:**
- Create: `api/src/controllers/roleController.ts`, `api/src/routes/roles.ts`
- Modify: `api/src/app.ts`
- Test: `api/test/routes/roles.test.ts`
- Reference: `OLD: api/src/controllers/roleController.js`

**Interfaces:**
- Consumes: `getDb`, `serializeRole` (with `userCount`), `auth`, `ok`/`fail`.
- Produces: `getRoles, createRole, updateRole, deleteRole`; router at `/api/v1/roles`. `getRoles` (sorted createdAt ASC) attaches `userCount` via `COUNT` over `user_roles GROUP BY role_id`. `createRole` **preserves the quirk: missing `name` → `ROLE_NAME_EXISTS` (400)** and maps UNIQUE→`ROLE_NAME_EXISTS`. `updateRole`/`deleteRole` return `ROLE_NOT_FOUND` when absent. `deleteRole` also deletes matching `user_roles` rows.

> **Prereq:** `ERRORS.ROLE_NOT_FOUND` is already in the Task 3 map (it exists in OLD `errorCodes.js`: `{ code:'ROLE_NOT_FOUND', message:'Role not found', status:404 }`).

- [ ] **Step 1: Write failing tests** `api/test/routes/roles.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ra','ra@x.co','h','','free','active','x','x')").run();
  token = await signToken('ra', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('roles routes', () => {
  it('create returns _id + parsed permissions; list shows numeric userCount', async () => {
    const c = await app.request('/api/v1/roles', post({ name: 'mgr', description: 'd', permissions: { urls: { view: true } } }), env);
    expect(c.status).toBe(201);
    const cb = await c.json() as any;
    expect(cb.data._id).toBeTruthy();
    expect(cb.data.permissions).toEqual({ urls: { view: true } });
    const list = await app.request('/api/v1/roles', { headers: authH() }, env);
    const lb = await list.json() as any;
    expect(lb.data.find((r: any) => r.name === 'mgr')).toMatchObject({ userCount: 0 });
  });
  it('create with no name → ROLE_NAME_EXISTS (the quirk)', async () => {
    const res = await app.request('/api/v1/roles', post({ description: 'x' }), env);
    expect(res.status).toBe(400);
    expect((await res.json() as any).errorCode).toBe('ROLE_NAME_EXISTS');
  });
  it('create duplicate name → ROLE_NAME_EXISTS', async () => {
    await app.request('/api/v1/roles', post({ name: 'dupr' }), env);
    const res = await app.request('/api/v1/roles', post({ name: 'dupr' }), env);
    expect((await res.json() as any).errorCode).toBe('ROLE_NAME_EXISTS');
  });
  it('delete removes role and its user_roles; update missing → ROLE_NOT_FOUND', async () => {
    const c = await app.request('/api/v1/roles', post({ name: 'tmp' }), env);
    const id = (await c.json() as any).data._id;
    await env.DB.prepare("INSERT INTO user_roles (user_id,role_id) VALUES ('ra',?)").bind(id).run();
    const d = await app.request(`/api/v1/roles/${id}`, { method: 'DELETE', headers: authH() }, env);
    expect(d.status).toBe(200);
    const n = await env.DB.prepare('SELECT COUNT(*) n FROM user_roles WHERE role_id=?').bind(id).first<{ n: number }>();
    expect(n!.n).toBe(0);
    const u = await app.request(`/api/v1/roles/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect((await u.json() as any).errorCode).toBe('ROLE_NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- routes/roles`

- [ ] **Step 3: Implement `api/src/controllers/roleController.ts`**

```ts
import type { Context } from 'hono';
import { eq, asc, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { roles, userRoles } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { serializeRole } from '../serializers';
import { nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const isUniqueErr = (e: unknown) => String((e as any)?.message || e).includes('UNIQUE constraint failed');

export const getRoles = async (c: C) => {
  const db = getDb(c.env);
  const rows = await db.select().from(roles).orderBy(asc(roles.createdAt)).all();
  const counts = await db.select({ roleId: userRoles.roleId, n: sql<number>`count(*)` }).from(userRoles).groupBy(userRoles.roleId).all();
  const countMap = new Map(counts.map((r) => [r.roleId, r.n]));
  return ok(c, { data: rows.map((r) => serializeRole(r, countMap.get(r.id) || 0)) });
};

export const createRole = async (c: C) => {
  const { name, description, permissions } = await c.req.json().catch(() => ({}));
  if (!name) return fail(c, 'ROLE_NAME_EXISTS'); // preserved quirk
  const db = getDb(c.env);
  const id = uuid(); const now = nowIso();
  try {
    await db.insert(roles).values({ id, name, description: description || '', permissions: JSON.stringify(permissions || {}), createdAt: now, updatedAt: now });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'ROLE_NAME_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
  const row = await db.select().from(roles).where(eq(roles.id, id)).get();
  return ok(c, { data: serializeRole(row) }, 201);
};

export const updateRole = async (c: C) => {
  const { name, description, permissions } = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (name !== undefined) set.name = name;
  if (description !== undefined) set.description = description;
  if (permissions !== undefined) set.permissions = JSON.stringify(permissions);
  try {
    const updated = await db.update(roles).set(set).where(eq(roles.id, c.req.param('id'))).returning().get();
    if (!updated) return fail(c, 'ROLE_NOT_FOUND');
    return ok(c, { data: serializeRole(updated) });
  } catch (e) {
    if (isUniqueErr(e)) return fail(c, 'ROLE_NAME_EXISTS');
    return fail(c, 'SERVER_ERROR');
  }
};

export const deleteRole = async (c: C) => {
  const db = getDb(c.env);
  const id = c.req.param('id');
  const deleted = await db.delete(roles).where(eq(roles.id, id)).returning().get();
  if (!deleted) return fail(c, 'ROLE_NOT_FOUND');
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  return ok(c, { message: 'Role deleted successfully' });
};
```

- [ ] **Step 4: Implement `api/src/routes/roles.ts`** + mount in `app.ts`

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/roleController';

export const roleRoutes = new Hono<AppBindings>();
roleRoutes.use('*', auth);
roleRoutes.get('/', ctrl.getRoles);
roleRoutes.post('/', ctrl.createRole);
roleRoutes.put('/:id', ctrl.updateRole);
roleRoutes.delete('/:id', ctrl.deleteRole);
```
In `app.ts`: `import { roleRoutes } from './routes/roles'; app.route('/api/v1/roles', roleRoutes);`

- [ ] **Step 5: Run — expect PASS.** `cd api && npm test -- routes/roles`
- [ ] **Step 6: Commit** `git commit -m "feat(api): roles routes (userCount, CRUD, missing-name quirk, ROLE_NOT_FOUND)"`

---

## Task 16: API-keys routes + controller (hash + prefix + show-once)

**Files:**
- Create: `api/src/controllers/apiKeyController.ts`, `api/src/routes/apiKeys.ts`
- Modify: `api/src/app.ts`
- Test: `api/test/routes/apiKeys.test.ts`
- Reference: `OLD: api/src/controllers/apiKeyController.js`

**Interfaces:**
- Consumes: `getDb`, `generateKey`, `formatKey`, `parseDevice`, `last7Days`, `auth`, `ok`/`fail`.
- Produces: `listKeys, createKey, updateKey, deleteKey, getKeyStats`; router at `/api/v1/api-keys`. `createKey` returns the **full key once** (`{ key: { ...formatKey(row,user), apiKey: fullKey } }`, 201). `listKeys` returns `{ keys: formatKey[], pagination }` with `keyPrefix` only. Ad-hoc errors (no `code` field): missing `keyName`→`{success:false,message:'keyName is required'}` (400); not-found→`{success:false,message:'API Key not found'}` (404).

- [ ] **Step 1: Write failing tests** `api/test/routes/apiKeys.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import app from '../../src/app';
import { signToken } from '../../src/lib/jwt';

let token: string;
beforeAll(async () => {
  (env as any).JWT_SECRET = 'sec';
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ka','ka@x.co','h','K','free','active','x','x')").run();
  token = await signToken('ka', 'sec');
});
const authH = () => ({ Authorization: `Bearer ${token}` });
const post = (body: any) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...authH() }, body: JSON.stringify(body) });

describe('api-keys routes', () => {
  it('create returns full key once + keyPrefix (201)', async () => {
    const res = await app.request('/api/v1/api-keys', post({ keyName: 'CI' }), env);
    expect(res.status).toBe(201);
    const b = await res.json() as any;
    expect(b.key.apiKey).toMatch(/^ak_live_[A-Za-z0-9]{40}$/);
    expect(b.key.keyPrefix).toBe(b.key.apiKey.slice(0, 14));
  });
  it('list returns keyPrefix only, never full key or hash', async () => {
    const res = await app.request('/api/v1/api-keys', { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.keys[0]).toHaveProperty('keyPrefix');
    expect(b.keys[0]).not.toHaveProperty('apiKey');
    expect(b.keys[0]).not.toHaveProperty('keyHash');
    expect(b.pagination).toHaveProperty('total');
  });
  it('create without keyName → ad-hoc 400 body (no code)', async () => {
    const res = await app.request('/api/v1/api-keys', post({}), env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, message: 'keyName is required' });
  });
  it('update/delete missing id → ad-hoc 404 body', async () => {
    const u = await app.request('/api/v1/api-keys/nope', { method: 'PUT', headers: { 'content-type': 'application/json', ...authH() }, body: '{}' }, env);
    expect(u.status).toBe(404);
    expect(await u.json()).toEqual({ success: false, message: 'API Key not found' });
  });
  it('getKeyStats returns key + stats + timeline + devices', async () => {
    const created = await app.request('/api/v1/api-keys', post({ keyName: 'S' }), env);
    const id = (await created.json() as any).key.id;
    const res = await app.request(`/api/v1/api-keys/${id}/stats`, { headers: authH() }, env);
    const b = await res.json() as any;
    expect(b.key.id).toBe(id);
    expect(b.stats).toHaveProperty('totalLinks');
    expect(Array.isArray(b.timeline)).toBe(true);
    expect(Array.isArray(b.devices)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- routes/apiKeys`

- [ ] **Step 3: Implement `api/src/controllers/apiKeyController.ts`**

```ts
import type { Context } from 'hono';
import { eq, and, or, like, desc, inArray, gte, sql } from 'drizzle-orm';
import type { AppBindings } from '../env';
import { getDb } from '../db/client';
import { apiKeys, users, links, redirectLogs } from '../db/schema';
import { ok, fail } from '../lib/errorCodes';
import { generateKey } from '../lib/keys';
import { formatKey } from '../serializers';
import { parseDevice } from '../lib/geo';
import { last7Days, nowIso } from '../lib/time';

type C = Context<AppBindings>;
const uuid = () => crypto.randomUUID();
const adhoc = (c: C, message: string, status: 400 | 404) => c.json({ success: false, message }, status);
const dayOf = (iso: string) => iso.split('T')[0];

export const listKeys = async (c: C) => {
  const db = getDb(c.env);
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const conds = [] as any[];
  if (status) conds.push(eq(apiKeys.status, status));
  if (search) conds.push(or(like(apiKeys.keyName, `%${search}%`), like(apiKeys.keyPrefix, `%${search}%`)));
  const where = conds.length ? and(...conds) : undefined;
  const totalRow = await db.select({ n: sql<number>`count(*)` }).from(apiKeys).where(where).get();
  const total = totalRow?.n ?? 0;
  const rows = await db.select().from(apiKeys).where(where).orderBy(desc(apiKeys.createdAt)).limit(limit).offset((page - 1) * limit).all();
  const userMap = new Map<string, any>();
  const uids = [...new Set(rows.map((r) => r.userId))];
  if (uids.length) for (const u of await db.select().from(users).where(inArray(users.id, uids)).all()) userMap.set(u.id, u);
  return ok(c, {
    keys: rows.map((k) => formatKey(k, userMap.get(k.userId))),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

export const createKey = async (c: C) => {
  const { keyName, userId, scopes, expiresAt } = await c.req.json().catch(() => ({}));
  if (!keyName) return adhoc(c, 'keyName is required', 400);
  const db = getDb(c.env);
  const targetUserId = userId || c.get('user').id;
  const user = await db.select().from(users).where(eq(users.id, targetUserId)).get();
  if (!user) return fail(c, 'USER_NOT_FOUND');
  const { fullKey, keyHash, keyPrefix } = await generateKey();
  const id = uuid(); const now = nowIso();
  await db.insert(apiKeys).values({ id, userId: targetUserId, keyName, keyHash, keyPrefix, scopes: JSON.stringify(scopes || { links: 'read', stats: 'read' }), status: 'active', expiresAt: expiresAt || null, lastUsedAt: null, isPersonal: 0, createdAt: now, updatedAt: now });
  const row = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
  return ok(c, { key: { ...formatKey(row, user), apiKey: fullKey } }, 201);
};

export const updateKey = async (c: C) => {
  const { keyName, scopes, status, expiresAt } = await c.req.json().catch(() => ({}));
  const db = getDb(c.env);
  const set: Record<string, unknown> = { updatedAt: nowIso() };
  if (keyName !== undefined) set.keyName = keyName;
  if (scopes !== undefined) set.scopes = JSON.stringify(scopes);
  if (status !== undefined) set.status = status;
  if (expiresAt !== undefined) set.expiresAt = expiresAt || null;
  const updated = await db.update(apiKeys).set(set).where(eq(apiKeys.id, c.req.param('id'))).returning().get();
  if (!updated) return adhoc(c, 'API Key not found', 404);
  const user = await db.select().from(users).where(eq(users.id, updated.userId)).get();
  return ok(c, formatKey(updated, user));
};

export const deleteKey = async (c: C) => {
  const db = getDb(c.env);
  const deleted = await db.delete(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).returning().get();
  if (!deleted) return adhoc(c, 'API Key not found', 404);
  return ok(c, {});
};

export const getKeyStats = async (c: C) => {
  const db = getDb(c.env);
  const key = await db.select().from(apiKeys).where(eq(apiKeys.id, c.req.param('id'))).get();
  if (!key) return adhoc(c, 'API Key not found', 404);
  const user = await db.select().from(users).where(eq(users.id, key.userId)).get();
  const now = new Date();
  const userLinks = await db.select().from(links).where(eq(links.createdBy, key.userId)).all();
  const ids = userLinks.map((l) => l.id);
  const logs = ids.length
    ? await db.select().from(redirectLogs).where(and(inArray(redirectLogs.linkId, ids), gte(redirectLogs.createdAt, new Date(now.getTime() - 7 * 864e5).toISOString()))).orderBy(desc(redirectLogs.createdAt)).limit(1000).all()
    : [];
  const totalClicks = userLinks.reduce((s, l) => s + l.clickCount, 0);
  const activeLinks = userLinks.filter((l) => l.isActive === 1 && (!l.expiresAt || new Date(l.expiresAt) > now)).length;
  const timeline = last7Days(now).map((date) => ({
    date,
    clicks: logs.filter((l) => dayOf(l.createdAt) === date).length,
    linksCreated: userLinks.filter((l) => dayOf(l.createdAt) === date).length,
  }));
  const deviceMap: Record<string, number> = {};
  for (const l of logs) { const ua = (l.userAgent || '').toLowerCase(); let d = 'Unknown'; if (/mobile|android|iphone|ipad/.test(ua)) d = 'Mobile'; else if (/windows|mac|linux/.test(ua)) d = 'Desktop'; deviceMap[d] = (deviceMap[d] || 0) + 1; }
  const devices = Object.entries(deviceMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return ok(c, { key: formatKey(key, user), stats: { totalLinks: userLinks.length, activeLinks, totalClicks }, timeline, devices });
};
```

> **Note:** `getKeyStats` device bucketing in OLD uses Mobile/Desktop/Unknown (different from `parseDevice`'s browser/OS string used in link analytics) — reproduce the OLD `getKeyStats` regex bucketing exactly as above, NOT `parseDevice`.

- [ ] **Step 4: Implement `api/src/routes/apiKeys.ts`** + mount in `app.ts`

```ts
import { Hono } from 'hono';
import type { AppBindings } from '../env';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/apiKeyController';

export const apiKeyRoutes = new Hono<AppBindings>();
apiKeyRoutes.use('*', auth);
apiKeyRoutes.get('/', ctrl.listKeys);
apiKeyRoutes.post('/', ctrl.createKey);
apiKeyRoutes.get('/:id/stats', ctrl.getKeyStats);
apiKeyRoutes.put('/:id', ctrl.updateKey);
apiKeyRoutes.delete('/:id', ctrl.deleteKey);
```
In `app.ts`: `import { apiKeyRoutes } from './routes/apiKeys'; app.route('/api/v1/api-keys', apiKeyRoutes);`

- [ ] **Step 5: Run — expect PASS.** `cd api && npm test -- routes/apiKeys`
- [ ] **Step 6: Commit** `git commit -m "feat(api): api-keys routes (hash+prefix+show-once, stats, ad-hoc errors)"`

---

## Task 17: Redirect handler + hostname routing + Static Assets

**Files:**
- Create: `api/src/controllers/redirectController.ts`
- Modify: `api/src/index.ts` (hostname dispatch + assets fallback), `api/src/app.ts` (optional: keep API-only)
- Test: `api/test/redirect.test.ts`
- Reference: `OLD: api/src/controllers/redirectController.js`

**Interfaces:**
- Consumes: `getDb`, `ok`/`fail` (redirect uses `c.redirect`/raw Response), `links`, `redirectLogs`.
- Produces: `handleRedirect(request, env, ctx)` returning a `Response` (302 or error). `index.ts` dispatches: `api.blly.to` → `app.fetch`; `blly.to` non-asset → redirect; assets → `env.ASSETS.fetch`.

- [ ] **Step 1: Write failing tests** `api/test/redirect.test.ts`

```ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, beforeAll, expect } from 'vitest';
import worker from '../src/index';

beforeAll(async () => {
  await env.DB.prepare("INSERT INTO users (id,email,password,full_name,account_type,status,created_at,updated_at) VALUES ('ru','r@x.co','h','','free','active','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl1','go','https://dest.example','ru',0,1,'x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,expires_at,created_at,updated_at) VALUES ('rl2','old','https://dest2.example','ru',0,1,'2000-01-01T00:00:00Z','x','x')").run();
  await env.DB.prepare("INSERT INTO links (id,code,destination_url,created_by,click_count,is_active,created_at,updated_at) VALUES ('rl3','off','https://dest3.example','ru',0,0,'x','x')").run();
});

const hit = async (path: string) => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`https://blly.to${path}`), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
};

describe('redirect', () => {
  it('redirects active code with 302 to destination', async () => {
    const res = await hit('/go');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://dest.example');
  });
  it('increments click_count and writes a log (via waitUntil)', async () => {
    await hit('/go');
    const row = await env.DB.prepare("SELECT click_count FROM links WHERE id='rl1'").first<{ click_count: number }>();
    expect(row!.click_count).toBeGreaterThanOrEqual(1);
    const logs = await env.DB.prepare("SELECT COUNT(*) n FROM redirect_logs WHERE link_id='rl1'").first<{ n: number }>();
    expect(logs!.n).toBeGreaterThanOrEqual(1);
  });
  it('expired link → LINK_EXPIRED', async () => {
    const res = await hit('/old');
    expect((await res.json() as any).errorCode).toBe('LINK_EXPIRED');
  });
  it('inactive link → LINK_NOT_FOUND', async () => {
    const res = await hit('/off');
    expect((await res.json() as any).errorCode).toBe('LINK_NOT_FOUND');
  });
  it('unknown code → LINK_NOT_FOUND', async () => {
    const res = await hit('/nope');
    expect((await res.json() as any).errorCode).toBe('LINK_NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- redirect`

- [ ] **Step 3: Implement `api/src/controllers/redirectController.ts`**

```ts
import { eq, and, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { getDb } from '../db/client';
import { links, redirectLogs } from '../db/schema';
import { ERRORS } from '../lib/errorCodes';
import { nowIso } from '../lib/time';

const errJson = (key: 'LINK_NOT_FOUND' | 'LINK_EXPIRED' | 'SERVER_ERROR') => {
  const e = ERRORS[key];
  return Response.json({ success: false, errorCode: e.code, message: e.message }, { status: e.status }); // FLAT, matches fail()
};

export async function handleRedirect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const code = new URL(request.url).pathname.slice(1);
  const db = getDb(env);
  try {
    const link = await db.select().from(links).where(and(eq(links.code, code), eq(links.isActive, 1))).get();
    if (!link) return errJson('LINK_NOT_FOUND');
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return errJson('LINK_EXPIRED');

    const cf = (request as any).cf || {};
    const log = {
      id: crypto.randomUUID(), linkId: link.id,
      ip: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer') || null,
      country: cf.country || null, city: cf.city || null,
      createdAt: nowIso(),
    };
    ctx.waitUntil((async () => {
      try {
        await db.batch([
          // SQL-expression increment (not read-modify-write) so concurrent redirects don't lose counts
          db.update(links).set({ clickCount: sql`${links.clickCount} + 1` }).where(eq(links.id, link.id)),
          db.insert(redirectLogs).values(log),
        ]);
      } catch { /* never fail the redirect */ }
    })());

    return Response.redirect(link.destinationUrl, 302);
  } catch {
    return errJson('SERVER_ERROR');
  }
}
```

> `Response.redirect` normalizes the URL; tests assert the `location` header equals the stored absolute URL. If a relative/edge case arises, use `new Response(null, { status: 302, headers: { Location: link.destinationUrl } })`.

- [ ] **Step 4: Wire hostname dispatch in `api/src/index.ts`**

```ts
import app from './app';
import { handleRedirect } from './controllers/redirectController';
import type { Env } from './env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname;

    // API host → Hono
    if (host.startsWith('api.')) return app.fetch(request, env, ctx);

    // Apex/short host: try static assets first; if none, treat as a code redirect
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return assetRes;

    // Non-asset path on the apex:
    if (url.pathname === '/' || url.pathname === '') return assetRes; // landing 404 fallthrough
    return handleRedirect(request, env, ctx);
  },
};
```

> **Asset-vs-code precedence (spec §4.2):** `env.ASSETS.fetch` returns 404 for paths with no matching file → those are codes. Ensure `wrangler.jsonc` assets config does NOT set `not_found_handling: "single-page-application"` (it would 200 every path and shadow `/:code`). In tests, the local assets dir has only `index.html`, so `/go` → 404 from ASSETS → redirect handler. Verify in the `wrangler dev` smoke test (Task 19).

- [ ] **Step 5: Run — expect PASS.** `cd api && npm test -- redirect`

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/redirectController.ts api/src/index.ts api/test/redirect.test.ts
git commit -m "feat(api): redirect handler + hostname routing + assets fallback"
```

---

## Task 18: Seed admin role + user

**Files:**
- Create: `api/src/seed.ts`, `api/scripts/seed.sql` (generated/templated)
- Test: `api/test/seed.test.ts`

**Interfaces:**
- Produces: `seedAdmin(env, { email, password }): Promise<{ roleId, userId }>` — idempotent (skip if admin email exists). Admin role `permissions` = full matrix (menus `dashboard,urls,users,docs,api_key,api_keys,roles` × actions `view,edit,delete` all true).

- [ ] **Step 1: Write the failing test** `api/test/seed.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { seedAdmin, ADMIN_PERMISSIONS } from '../src/seed';

describe('seed', () => {
  it('creates an admin role with the full matrix and an admin user', async () => {
    const { roleId, userId } = await seedAdmin(env as any, { email: 'admin@blly.to', password: 'admin12345' });
    const role = await env.DB.prepare('SELECT permissions FROM roles WHERE id=?').bind(roleId).first<{ permissions: string }>();
    expect(JSON.parse(role!.permissions)).toEqual(ADMIN_PERMISSIONS);
    const link = await env.DB.prepare('SELECT COUNT(*) n FROM user_roles WHERE user_id=? AND role_id=?').bind(userId, roleId).first<{ n: number }>();
    expect(link!.n).toBe(1);
  });
  it('is idempotent (second call does not duplicate)', async () => {
    await seedAdmin(env as any, { email: 'admin2@blly.to', password: 'admin12345' });
    await seedAdmin(env as any, { email: 'admin2@blly.to', password: 'admin12345' });
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE email='admin2@blly.to'").first<{ n: number }>();
    expect(n!.n).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `cd api && npm test -- seed`

- [ ] **Step 3: Implement `api/src/seed.ts`**

```ts
import { eq } from 'drizzle-orm';
import type { Env } from './env';
import { getDb } from './db/client';
import { users, roles, userRoles } from './db/schema';
import { hashPassword } from './lib/password';
import { nowIso } from './lib/time';

const MENUS = ['dashboard', 'urls', 'users', 'docs', 'api_key', 'api_keys', 'roles'] as const;
const ACTIONS = ['view', 'edit', 'delete'] as const;
export const ADMIN_PERMISSIONS = Object.fromEntries(
  MENUS.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, true]))])
);

export async function seedAdmin(env: Env, opts: { email: string; password: string }) {
  const db = getDb(env);
  const email = opts.email.toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    const r = await db.select().from(roles).where(eq(roles.name, 'admin')).get();
    return { roleId: r!.id, userId: existing.id };
  }
  const now = nowIso();
  let role = await db.select().from(roles).where(eq(roles.name, 'admin')).get();
  let roleId = role?.id;
  if (!roleId) {
    roleId = crypto.randomUUID();
    await db.insert(roles).values({ id: roleId, name: 'admin', description: 'Administrator', permissions: JSON.stringify(ADMIN_PERMISSIONS), createdAt: now, updatedAt: now });
  }
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email, password: await hashPassword(opts.password), fullName: 'Admin', accountType: 'enterprise', status: 'active', createdAt: now, updatedAt: now });
  await db.insert(userRoles).values({ userId, roleId });
  return { roleId, userId };
}
```

- [ ] **Step 4: Run — expect PASS.** `cd api && npm test -- seed`

- [ ] **Step 5: Wire a one-time guarded seed route** (one concrete procedure). In `app.ts` add (and remove after seeding):

```ts
import { seedAdmin } from './seed';
app.post('/api/v1/_seed', async (c) => {
  if (c.req.header('x-seed-token') !== (c.env as any).SEED_TOKEN) return c.json({ success: false }, 403);
  const { email, password } = await c.req.json();
  const r = await seedAdmin(c.env, { email, password });
  return c.json({ success: true, ...r });
});
```
Add `SEED_TOKEN: string` to `Env`. Then:
- `cd api && npx wrangler secret put SEED_TOKEN` (paste a random value) — expected: `Success! Uploaded secret SEED_TOKEN`.
- After deploy (Task 19 Step 8): `curl -s -X POST https://api.blly.to/api/v1/_seed -H "x-seed-token: <value>" -H 'content-type: application/json' -d '{"email":"admin@blly.to","password":"<strong-pw>"}'` — expected `{"success":true,"roleId":"...","userId":"..."}`.
- Remove the `_seed` route + `SEED_TOKEN` from `Env`, redeploy, and `git commit -m "chore(api): remove one-time seed route"`.

- [ ] **Step 6: Commit**

```bash
git add api/src/seed.ts api/test/seed.test.ts
git commit -m "feat(api): admin seed (full RBAC matrix, idempotent)"
```

---

## Task 19: Finalize config, full test run, deploy & cut over

**Files:**
- Modify: `api/wrangler.jsonc` (routes, vars, prod CORS), `api/src/app.ts` (CORS origin), remove OLD Express files
- Test: full suite + manual `wrangler dev` smoke

**Interfaces:** none new — integration/deploy.

- [ ] **Step 1: Set production routes + vars in `api/wrangler.jsonc`**

```jsonc
{
  // ...existing...
  "routes": [
    { "pattern": "api.blly.to/*", "zone_name": "blly.to" },
    { "pattern": "blly.to/*", "zone_name": "blly.to" }
  ],
  "vars": { "BASE_SHORT_URL": "https://blly.to" }
}
```

- [ ] **Step 2: Set the JWT secret**

Run: `cd api && npx wrangler secret put JWT_SECRET` (paste a strong value). Expected: `Success! Uploaded secret JWT_SECRET`.

- [ ] **Step 3: Confirm CORS origin** in `app.ts` is `https://app.blly.to` (plus localhost for dev). Remove the localhost origin before final prod deploy if desired.

- [ ] **Step 4: Run the entire test suite**

Run: `cd api && npm test`
Expected: ALL tests pass (smoke, schema, errorCodes, password, jwt, keys, meta, serializers, auth mw, checkPermission, auth/links/links-analytics/users/roles/apiKeys routes, redirect, seed).

- [ ] **Step 5: Apply migrations to remote**

Run: `cd api && npm run db:migrate:remote`
Expected: 6 tables created on the remote D1.

- [ ] **Step 6: Local smoke test with `wrangler dev`** (verifies assets-vs-redirect precedence)

Run: `cd api && npx wrangler dev` (serves on `http://localhost:8787`). Hostname routing keys off the `Host` header, so pass it explicitly:
- Landing: `curl -i http://localhost:8787/` — expect `200` + the landing HTML.
- API health: `curl -i -H 'Host: api.blly.to' http://localhost:8787/api/v1/health` — expect `200 {"success":true,"status":"ok"}`.
- Register + create a link, then redirect:
  ```bash
  TOKEN=$(curl -s -H 'Host: api.blly.to' -H 'content-type: application/json' -d '{"email":"dev@x.co","password":"pw123456"}' http://localhost:8787/api/v1/auth/register | sed -E 's/.*"token":"([^"]+)".*/\1/')
  CODE=$(curl -s -H 'Host: api.blly.to' -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"destinationUrl":"https://example.com","title":"t","description":"d"}' http://localhost:8787/api/v1/links | sed -E 's/.*"code":"([^"]+)".*/\1/')
  curl -i "http://localhost:8787/$CODE"   # expect 302 with Location: https://example.com
  ```
Confirm `/` serves landing and `/<code>` 302-redirects (asset-vs-code precedence works).

- [ ] **Step 7: Place the real landing build** into `api/public` (output of the frontend sub-project §15). Until then the placeholder `index.html` stands in.

- [ ] **Step 8: Deploy**

Run: `cd api && npm run deploy`
Then seed the admin (Task 18 Step 5) and smoke-test `https://api.blly.to/api/v1/health`, `https://blly.to/<code>`, `https://blly.to/`.

- [ ] **Step 9: Remove the OLD Express backend** (after verifying the new one in prod)

```bash
git rm -r api/index.js api/src/app.js api/src/config api/src/controllers/*.js api/src/middleware/*.js api/src/models api/src/routes/*.js api/vercel.json
# (keep package.json/package-lock if replaced; ensure node_modules is gitignored)
git commit -m "chore(api): remove legacy Express/Mongo backend after Workers cutover"
```

- [ ] **Step 10: Decommission** the Vercel API project and MongoDB Atlas cluster (manual, outside the repo). Update the frontend sub-project (§15) to point at `https://api.blly.to/api/v1`.

- [ ] **Step 11: Final commit**

```bash
git add api/wrangler.jsonc api/src/app.ts
git commit -m "chore(api): production routes, CORS, and cutover config"
```

---

## Self-Review Notes (author checklist — verify before execution)

- **Spec coverage:** Tasks map to spec — schema §5 (T2), serialization §6 (T8 + per-controller), library swaps §7 (T3–T7), auth/RBAC §8 (T9–T10), endpoints §9 (T11–T16), redirect §10 (T17), seed §11 (T18), testing §12 (every task), rollout §16 (T19). Static-assets/topology §4.2 (T17/T19). API-key hash+prefix+show-once §7.3 (T6/T8/T16/T11).
- **Type consistency:** `getDb`, `ok/fail`, `signToken/verifyToken`, `hashPassword/verifyPassword`, `generateKey/hashKey/keyPrefixOf`, `fetchPageMeta`, serializer names, `AppBindings`/`Env`/`AuthUser` are used identically across tasks.
- **All tasks (T1–T19) carry complete test + implementation code** — no behavior-only/placeholder steps. T14–T16 controllers are fully transcribed (users richer payload, roles `ROLE_NOT_FOUND` + missing-name quirk, api-keys hash+prefix+show-once + ad-hoc bodies + OLD `getKeyStats` Mobile/Desktop bucketing).
- **ERRORS map:** Task 3 inlines all 24 entries verbatim (incl. `ROLE_NOT_FOUND`/`USER_NOT_FOUND`/`LINK_*`/`AUTH_*`/`FORBIDDEN`/`SERVER_ERROR`) — no copy-from-OLD step needed.
- **Error envelope is FLAT** (`{success:false, errorCode, message}`) everywhere — `fail()` (Task 3) and the redirect `errJson` (Task 17) both use it; all tests assert `.errorCode`. This matches OLD `errorCodes.js` exactly (verified) — the frontend reads `errorCode`/`message`.
- **Test DB migrations** are applied by `test/apply-migrations.ts` (Task 1 Step 7b) — NOT auto-applied by vitest-pool-workers; migrations must be generated (Task 2 Step 5) before route tests run.
