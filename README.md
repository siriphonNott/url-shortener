# Blly.to — URL Shortener

ระบบจัดการ Short Link พร้อม Analytics, RBAC และ API Keys รันบน **Cloudflare Workers + D1** (เดิมเป็น Express + MongoDB บน Vercel, ย้ายมาทั้งหมดแล้ว)

> **Live (เดโม):** API `https://api.eraflow.dev` · Short links + Landing `https://eraflow.dev` · แอปจัดการ `https://app.eraflow.dev`
> โดเมนเป้าหมายคือ `blly.to` (ยังไม่ได้เพิ่มเข้า Cloudflare account จึงรันบน `eraflow.dev` ไปก่อน)

---

## Features

- สร้าง Short Link พร้อม Custom Code (ไม่ระบุ → สุ่ม `nanoid(7)`) และดึง title/description ของปลายทางอัตโนมัติ
- Redirect แบบ 302 (ไม่ต้อง Auth) + นับ clickCount แบบ atomic และบันทึก redirect log (IP / User-Agent / Referer / ประเทศ-เมืองจาก `request.cf`)
- Analytics: timeline 7 วัน, devices, trafficType, locations
- Authentication ด้วย JWT (HS256, 7 วัน) และ API Key (`X-API-Key`) แบบ **hash + prefix + show-once**
- สมัครสมาชิกด้วย Email/Password (กัน bot ด้วย **Cloudflare Turnstile**) หรือ **Google Sign-In** (ยืนยัน Google ID token)
- จัดการ Users / Roles (RBAC) และ API Keys ผ่าน Web UI (Vue SPA) รองรับ 2 ภาษา (TH/EN) + Dark mode
- Link ผูกกับเจ้าของ (`createdBy`) — แก้/ลบ/ดู logs ได้เฉพาะลิงก์ของตัวเอง

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (ESM, ไม่มี Node built-ins, ไม่ใช้ `nodejs_compat` ใน prod) |
| Web framework | Hono |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM / drizzle-kit |
| Auth / Crypto | jose (JWT), WebCrypto (PBKDF2 password, SHA-256 API-key), Google ID-token + Cloudflare Turnstile |
| Static / Routing | Workers Static Assets + custom domains, hostname-based routing |
| Frontend | Vue 3, Vite, Pinia, Vue Router, vue-i18n, Tailwind CSS |
| Testing | Vitest + `@cloudflare/vitest-pool-workers` (Miniflare D1) — 93 tests / 21 files |
| Deploy | Cloudflare (Wrangler) |

---

## สถาปัตยกรรม (Architecture)

- **Worker เดียว routing ด้วย hostname** (`api/src/index.ts`): host ขึ้นต้น `api.` → ส่งเข้า Hono API; ไม่งั้นลอง static assets ก่อน แล้ว 404 → ตีความเป็น short code แล้ว redirect (apex `/` ตกไปที่ landing)
- **2 Workers ตอน deploy:** `blly-api` (API + landing + redirect) และ `blly-web` (SPA — เปิด SPA fallback). ทั้งคู่ผูก custom domain (Wrangler สร้าง DNS + TLS ให้อัตโนมัติ)
- **Frontend แยกโดเมน:** apex ใช้ SPA fallback ไม่ได้ (จะทับ `/{code}`) จึงเสิร์ฟ Landing อย่างเดียว และปุ่ม Login ของ Landing ชี้ไปที่ `app.eraflow.dev` ที่รัน SPA เต็ม
- **RBAC บังคับฝั่ง client** (middleware `checkPermission` มีแต่ยังไม่ wire) — endpoint ฝั่ง users/roles/api-keys เป็น admin surface แบบ auth-only

---

## โครงสร้างโปรเจค

```
url-shortener/
├── api/                      # Cloudflare Worker (Hono + D1/Drizzle)
│   ├── src/
│   │   ├── index.ts          # Worker entry — hostname routing
│   │   ├── app.ts            # Hono app: CORS, mounts, /health, onError
│   │   ├── controllers/      # auth, link, user, role, apiKey, redirect
│   │   ├── routes/           # auth, links, users, roles, apiKeys
│   │   ├── middleware/        # auth (JWT + x-api-key), checkPermission
│   │   ├── lib/              # errorCodes, password, jwt, keys, google, turnstile, errorPage, meta, geo, time
│   │   ├── serializers/      # wire shapes (_id/id, camelCase)
│   │   ├── db/               # schema.ts (6 tables), client.ts
│   │   └── seed.ts           # idempotent admin seed
│   ├── drizzle/              # SQL migrations
│   ├── public/               # apex assets (สำเนาของ web/dist — generated)
│   ├── test/                 # vitest-pool-workers
│   └── wrangler.jsonc
└── web/                      # Vue 3 SPA (landing + management app)
    ├── src/{views,components,stores,api,router,i18n,...}
    ├── vite.config.js        # dev proxy → worker (Host rewrite)
    └── wrangler.jsonc        # static-assets Worker (SPA fallback) → app.eraflow.dev
```

---

## API Endpoints (base `/api/v1`)

Response envelope แบบ **flat**: สำเร็จ `{ success:true, ...data }` / ผิดพลาด `{ success:false, errorCode, message }`
ฟิลด์เป็น camelCase, PK เป็น `_id` (link/role/log) หรือ `id` (user/api-key)

| Group | Method · Path | หมายเหตุ |
|-------|---------------|----------|
| Health | `GET /health` | `{ success:true, status:"ok" }` |
| Auth | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` | register กัน bot ด้วย Turnstile · google = ยืนยัน ID-token (sign-in/link/create) · คืน JWT |
| Auth | `GET /auth/me` · `PUT /auth/profile` · `PUT /auth/change-password` | ต้อง token |
| Auth | `GET /auth/api-key` · `POST /auth/api-key/regenerate` | personal key (show-once) |
| Links | `GET/POST /links` · `PUT/DELETE /links/:id` · `GET /links/code/:code` | owner-scoped |
| Links | `GET /links/analytics` · `GET /links/meta` · `GET /links/:id/logs` · `GET /links/:id/analytics` | |
| Shorten | `POST /shorten` | สร้างลิงก์ (ต้อง token หรือ API key) |
| Users | `GET/POST /users` · `PUT/DELETE /users/:id` | admin (auth-only) |
| Roles | `GET/POST /roles` · `PUT/DELETE /roles/:id` | admin (auth-only) |
| API Keys | `GET/POST /api-keys` · `PUT/DELETE /api-keys/:id` · `GET /api-keys/:id/stats` | admin (auth-only) |
| Redirect | `GET https://eraflow.dev/:code` | public 302 (ผ่านโดเมนหลัก ไม่ใช่ `/api`) |

Auth headers: `Authorization: Bearer <token>` หรือ `X-API-Key: <key>`

---

## รันในเครื่อง (Local Development)

```bash
cd api && npm install && cd ../web && npm install      # ติดตั้ง deps (ครั้งแรก)
cd api && npm run db:migrate:local                      # สร้างตารางใน local D1 (Miniflare)

# Terminal 1 — API (+ local D1, landing, redirect) ที่ http://localhost:8787
cd api && npm run dev
# Terminal 2 — SPA ที่ http://localhost:5173 (เปิดอันนี้ในเบราว์เซอร์)
cd web && npm run dev
```

- `api/.dev.vars` (gitignored): `JWT_SECRET`, `BASE_SHORT_URL=http://localhost:8787`
- `web/.env` (gitignored): `VITE_API_URL=/api/v1` (relative — ผ่าน proxy), `VITE_BASE_SHORT_URL=http://localhost:8787`
- เนื่องจาก Worker route ด้วย hostname, Vite proxy จะ forward `/api/v1` ไป `:8787` พร้อม header `Host: api.eraflow.dev`
- เทสต์ backend: `cd api && npm test`

---

## Deploy (Cloudflare)

ต้องมี API token สิทธิ์: **Account** — D1 Edit, Workers Scripts Edit, Account Settings Read · **Zone (eraflow.dev)** — Workers Routes Edit, DNS Edit, Zone Read
(ส่งผ่าน env `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — อย่า commit token)

```bash
# Backend
cd api && npm run db:migrate:remote && npm run deploy   # → api.eraflow.dev + eraflow.dev (blly-api)

# Frontend — ต้อง build + deploy ทั้งสองที่ ไม่งั้น landing บน apex จะค้างของเก่า
cd web && npm run build && npx wrangler deploy           # → app.eraflow.dev (blly-web)
rm -rf ../api/public/* && cp -r dist/. ../api/public/    # refresh apex landing
cd ../api && npx wrangler deploy                          # → eraflow.dev (blly-api)
```

ครั้งแรกต้อง `wrangler d1 create blly-db` แล้วใส่ `database_id` ใน `api/wrangler.jsonc`, ตั้ง secret `JWT_SECRET`
(และ `TURNSTILE_SECRET_KEY` + `GOOGLE_CLIENT_ID` ให้ signup/Google sign-in ทำงานบน prod), และ seed admin คนแรก
— ดูขั้นตอนเต็ม (admin seed / clone account / decommission) ใน [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §8

> หมายเหตุ: บน push ไป `main` มี **GitHub Actions** (`.github/workflows/deploy.yml`) รัน test → apply D1 migrations (remote) → build + deploy ทั้ง web และ api ให้อัตโนมัติ — manual deploy ด้านบนเป็น fallback

---

## เอกสารเพิ่มเติม

- **สถาปัตยกรรม / เหตุผลออกแบบ / ops:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — why-decisions, API quirks ที่ห้ามแก้, migration foot-guns, admin seed / clone / decommission, test patterns, scale & roadmap
- **คู่มือสำหรับ AI agent (state/คอนเวนชัน/invariants/gotchas):** [CLAUDE.md](CLAUDE.md)
