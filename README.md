# Blly.to

ระบบจัดการ Short Link แบบ Microservice พัฒนาด้วย Express.js + MongoDB Atlas + Vue.js พร้อม Deploy บน Vercel

---

## Features

- สร้าง Short Link พร้อมรองรับ Custom Code
- Redirect Link โดยไม่ต้องผ่านระบบ Auth
- จัดการ Link (เพิ่ม / แก้ไข / ลบ / เปิด-ปิดใช้งาน)
- บันทึก Log การ Redirect (IP, User Agent, Referer)
- ระบบ Authentication ด้วย JWT
- Web UI สำหรับจัดการ Link ผ่าน Browser

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Frontend | Vue 3, Vite, Pinia, Vue Router |
| Styling | Tailwind CSS |
| Deploy | Vercel |

---

## โครงสร้างโปรเจค

```
short-link/
├── api/                              # Express.js Backend
│   ├── index.js                      # Entry point
│   ├── vercel.json                   # Vercel deploy config
│   ├── .env.example                  # ตัวอย่าง environment variables
│   ├── package.json
│   └── src/
│       ├── app.js                    # Express app setup
│       ├── config/
│       │   └── db.js                 # MongoDB connection
│       ├── models/
│       │   ├── User.js               # User model
│       │   ├── Link.js               # Link model
│       │   └── RedirectLog.js        # Redirect log model
│       ├── middleware/
│       │   └── auth.js               # JWT auth middleware
│       ├── controllers/
│       │   ├── authController.js     # Register / Login / Me
│       │   ├── linkController.js     # CRUD links + logs
│       │   └── redirectController.js # Public redirect handler
│       └── routes/
│           ├── auth.js               # /api/auth/*
│           ├── links.js              # /api/links/* (protected)
│           └── redirect.js           # /:code (public)
│
└── web/                              # Vue.js Frontend
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vercel.json                   # Vercel SPA rewrite
    ├── .env.example
    ├── package.json
    └── src/
        ├── main.js
        ├── App.vue
        ├── style.css                 # Tailwind base
        ├── api/
        │   └── index.js              # Axios instance + interceptors
        ├── router/
        │   └── index.js             # Vue Router + route guards
        ├── stores/
        │   ├── auth.js              # Pinia auth store
        │   └── links.js             # Pinia links store
        ├── views/
        │   ├── LoginView.vue        # หน้า Login / Register
        │   └── DashboardView.vue    # หน้าหลัก dashboard
        └── components/
            ├── LinkTable.vue        # ตารางแสดง links
            ├── LinkForm.vue         # Modal สร้าง/แก้ไข link
            └── LogModal.vue         # Modal แสดง redirect logs
```

---

## API Endpoints

### Auth (ไม่ต้อง Token)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{ email, password }` | สมัครสมาชิก |
| POST | `/api/auth/login` | `{ email, password }` | เข้าสู่ระบบ รับ JWT Token |
| GET | `/api/auth/me` | — | ดูข้อมูล user ปัจจุบัน (ต้อง Token) |

### Links (ต้องใส่ Authorization Header)

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/links` | — | ดึง links ทั้งหมด |
| POST | `/api/links` | `{ originalUrl, title?, code? }` | สร้าง link ใหม่ |
| PUT | `/api/links/:id` | `{ originalUrl?, title?, isActive? }` | แก้ไข link |
| DELETE | `/api/links/:id` | — | ลบ link และ logs ที่เกี่ยวข้อง |
| GET | `/api/links/:id/logs` | — | ดู redirect logs ของ link |

### Redirect (Public — ไม่ต้อง Token)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:code` | Redirect ไปยัง Original URL |

**Authorization Header:**
```
Authorization: Bearer <token>
```

---

## Data Models

### User
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "password": "string (hashed)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Link
```json
{
  "_id": "ObjectId",
  "code": "string (unique)",
  "originalUrl": "string",
  "title": "string (optional)",
  "createdBy": "ObjectId (ref: User)",
  "clickCount": "number",
  "isActive": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### RedirectLog
```json
{
  "_id": "ObjectId",
  "link": "ObjectId (ref: Link)",
  "ip": "string",
  "userAgent": "string",
  "referer": "string",
  "createdAt": "Date"
}
```

---

## การติดตั้งและรันในเครื่อง (Local Development)

### 1. Clone และติดตั้ง Dependencies

```bash
# ติดตั้ง Backend
cd api
npm install

# ติดตั้ง Frontend
cd ../web
npm install
```

### 2. ตั้งค่า Environment Variables

**api/.env** (สร้างจาก `.env.example`)
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/shortlink
JWT_SECRET=your-strong-random-secret-key
PORT=3000
```

**web/.env** (สร้างจาก `.env.example`)
```env
VITE_API_URL=http://localhost:3000/api
```

### 3. รัน Development Server

```bash
# Terminal 1 — Backend
cd api
npm run dev
# Server จะรันที่ http://localhost:3000

# Terminal 2 — Frontend
cd web
npm run dev
# Web จะรันที่ http://localhost:5173
```

### 4. เข้าใช้งาน

เปิด Browser ไปที่ `http://localhost:5173` แล้วสมัครสมาชิกหรือเข้าสู่ระบบ

---

## Deploy บน Vercel

### Backend (api/)

1. Push โค้ดขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → New Project → Import repository
3. เลือก **Root Directory** เป็น `api`
4. ตั้ง **Environment Variables:**

| Key | Value |
|-----|-------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key สำหรับ JWT |

5. Deploy → คัดลอก URL ของ API ไว้ใช้ในขั้นตอนถัดไป

### Frontend (web/)

1. ไปที่ [vercel.com](https://vercel.com) → New Project → Import repository (เดิม)
2. เลือก **Root Directory** เป็น `web`
3. ตั้ง **Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-api.vercel.app/api` |

4. Deploy → เข้าใช้งานที่ URL ที่ได้รับ

---

## MongoDB Atlas Setup

1. สร้าง Account ที่ [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. สร้าง Cluster (Free Tier ใช้ได้)
3. ไปที่ **Database Access** → Add New User (จดจำ username/password)
4. ไปที่ **Network Access** → Add IP Address → `0.0.0.0/0` (Allow from anywhere สำหรับ Vercel)
5. ไปที่ **Clusters** → Connect → Drivers → คัดลอก Connection String
6. แทนที่ `<password>` ด้วย password ที่สร้างไว้

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shortlink
```

---

## ตัวอย่างการใช้งาน API (cURL)

```bash
# สมัครสมาชิก
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# เข้าสู่ระบบ
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# สร้าง Short Link
curl -X POST http://localhost:3000/api/links \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://www.example.com/very/long/url","title":"Example","code":"ex"}'

# ดึง Links ทั้งหมด
curl http://localhost:3000/api/links \
  -H "Authorization: Bearer <token>"

# ทดสอบ Redirect (เปิด Browser)
# http://localhost:3000/ex
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` (api) | รัน backend ด้วย nodemon |
| `npm start` (api) | รัน backend แบบ production |
| `npm run dev` (web) | รัน frontend development server |
| `npm run build` (web) | Build frontend สำหรับ production |
| `npm run preview` (web) | Preview production build |
