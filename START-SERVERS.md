# Starting GarmentHub — Backend and Frontend

This document mirrors the dev setup and run instructions from [README.md](README.md) so you can open a focused guide without scrolling the full readme.

Use **two terminals** (tabs or windows): one for the API, one for the Vite dev server.

---

## Prerequisites

- **Node.js** 18+ (includes `npm`; LTS recommended)
- **PostgreSQL** 14+ (running locally or reachable)
- A **database** created for the app (e.g. `garmenthub`)

---

## One-time setup

Run these from the **repository root**:

1. **Install dependencies** (workspace installs backend + frontend):

   ```bash
   npm install
   ```

2. **Backend environment** — copy the example and edit values:

   ```bash
   # Windows
   copy packages\backend\.env.example packages\backend\.env
   ```

   ```bash
   # macOS / Linux
   cp packages/backend/.env.example packages/backend/.env
   ```

   Set at least:

   - `DATABASE_URL` — PostgreSQL connection string (user, password, host, port, database name)
   - `JWT_SECRET` — a long random string in production
   - `PORT` — API port (default **4000**)

3. **Prisma client and schema:**

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Optional — sample data:**

   ```bash
   npm run db:seed
   ```

---

## Backend (API)

The API listens on **`http://localhost:4000`** by default (or the value of `PORT` in `.env`).

**From repository root (recommended):**

```bash
npm run backend:dev
```

**From the backend package:**

```bash
cd packages/backend
npm run dev
```

This runs `tsx watch src/index.ts` with hot reload.

**Verify:** open `http://localhost:4000/api/health` — you should see a JSON status response.

---

## Frontend (Vite)

The dev server is at **`http://localhost:3000`**. It **proxies `/api`** to **`http://localhost:4000`**, so start the backend first for full app behavior.

**From repository root (recommended):**

```bash
npm run frontend:dev
```

**From the frontend package:**

```bash
cd packages/frontend
npm run dev
```

**Open the app:** `http://localhost:3000`

---

## Typical daily workflow

1. Terminal 1: `npm run backend:dev`
2. Terminal 2: `npm run frontend:dev`
3. Use the UI at `http://localhost:3000`

---

## Production-style commands (reference)

| Area | From repo root | From package |
|------|----------------|--------------|
| Backend build | `npm run backend:build` | `cd packages/backend && npm run build` |
| Backend start | — | `cd packages/backend && npm run start` (after `build`) |
| Frontend build | `npm run frontend:build` | `cd packages/frontend && npm run build` |
| Frontend preview | — | `cd packages/frontend && npm run preview` |

---

## Troubleshooting

- **`npm` not found** — install Node.js and ensure it is on your `PATH` (on Windows, restart the terminal after installing).
- **Database errors** — check `DATABASE_URL` in `packages/backend/.env` and that PostgreSQL is running.
- **API 404 or CORS in the browser** — open the app via the Vite URL on port **3000**, not `file://`; the dev server proxies `/api` to the backend.
- **Port in use** — stop the process using **4000** (backend) or **3000** (frontend), or change `PORT` / Vite `server.port` in `packages/frontend/vite.config.ts`.
