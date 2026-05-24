# GarmentHub

B2B garment trading platform connecting vendors and customers.

## Tech Stack

- **Frontend:** React + TypeScript + TailwindCSS (PWA)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** OTP-based login (mock)

The same setup and run steps below are also available as a standalone guide: [START-SERVERS.md](START-SERVERS.md).

## Prerequisites

- **Node.js** 18+ (includes `npm`; LTS recommended)
- **PostgreSQL** 14+ (running locally or reachable)
- A **database** created for the app (e.g. `garmenthub`)

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
   - `CORS_ORIGINS` — comma-separated browser origins allowed to call the API when the UI is on another host (see `packages/backend/.env.example`)

3. **Prisma client and schema:**

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Optional — sample data:**

   ```bash
   npm run db:seed
   ```

## Running the backend and frontend separately

Use **two terminals** (tabs or windows): one for the API, one for the Vite dev server.

### Backend (API)

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

### Frontend (Vite)

The dev server is at **`http://localhost:3000`**. By default the app uses same-origin **`/api`**, which Vite **proxies** to **`http://localhost:4000`** (override with `DEV_PROXY_TARGET` in `packages/frontend/.env`). For split hosts (UI and API on different domains), set **`VITE_API_ORIGIN`** to the API base URL and **`CORS_ORIGINS`** on the backend to include the UI origin. See `packages/frontend/.env.example` and [START-SERVERS.md](START-SERVERS.md).

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

### Typical daily workflow

1. Terminal 1: `npm run backend:dev`
2. Terminal 2: `npm run frontend:dev`
3. Use the UI at `http://localhost:3000`

## Production-style commands (reference)

| Area | From repo root | From package |
|------|----------------|--------------|
| Backend build | `npm run backend:build` | `cd packages/backend && npm run build` |
| Backend start | — | `cd packages/backend && npm run start` (after `build`) |
| Frontend build | `npm run frontend:build` | `cd packages/frontend && npm run build` |
| Frontend preview | — | `cd packages/frontend && npm run preview` |

## Troubleshooting

- **`npm` not found** — install Node.js and ensure it is on your `PATH` (on Windows, restart the terminal after installing).
- **Database errors** — check `DATABASE_URL` in `packages/backend/.env` and that PostgreSQL is running.
- **API 404 or CORS in the browser** — use the Vite URL on port **3000** for same-origin `/api`, or configure `VITE_API_ORIGIN` + `CORS_ORIGINS` for split hosts; see [START-SERVERS.md](START-SERVERS.md).
- **Port in use** — stop the process using **4000** (backend) or **3000** (frontend), or change `PORT` / Vite `server.port` in `packages/frontend/vite.config.ts`.

## Project Structure

```
packages/
  backend/    # Express API server
  frontend/   # React PWA
```
