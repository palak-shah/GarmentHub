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
   - `CORS_ORIGINS` — comma-separated browser origins allowed to call the API (required when the UI is on another host). Example: `https://garmenthub.in,https://www.garmenthub.in` for production, or `http://localhost:3000,http://127.0.0.1:3000` for local dev if the frontend calls the API directly.

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

The dev server is at **`http://localhost:3000`**.

- **Same-origin API (default):** leave `VITE_API_ORIGIN` unset. The app calls `/api` and Vite **proxies** `/api` and `/uploads` to **`http://localhost:4000`** (override with `DEV_PROXY_TARGET` in `packages/frontend/.env`).
- **Split hosts (like production):** set `VITE_API_ORIGIN` (e.g. `https://service.garmenthub.in` or `http://localhost:4000`) in `packages/frontend/.env` and ensure `CORS_ORIGINS` on the backend includes your UI origin (e.g. `http://localhost:3000`).

Copy `packages/frontend/.env.example` to `.env` / `.env.local` and adjust. For production builds, set `VITE_API_ORIGIN` and `VITE_PUBLIC_API_ORIGIN` to your API host (see `.env.example`).

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
- **API 404 or CORS in the browser** — if you use same-origin `/api`, open the app via the Vite URL on port **3000**, not `file://`. If the UI and API are on different hosts, set `VITE_API_ORIGIN` on the frontend and `CORS_ORIGINS` on the backend for your UI origin. Remove any **HTTP redirect** from the static site’s `/api` to the API host when using direct API calls (the browser should request `service…` only when configured, not via redirect).
- **Port in use** — stop the process using **4000** (backend) or **3000** (frontend), or change `PORT` / Vite `server.port` in `packages/frontend/vite.config.ts`.
- **Product photo upload returns HTML / “instead of JSON”** — phone camera files are large; nginx (and similar proxies) often default to **`client_max_body_size 1m`**, which returns an HTML **413** before the request reaches Node. **You must raise this on the proxy** that fronts the API (not only in the Node app). See [`packages/backend/docs/nginx-upload.example.conf`](packages/backend/docs/nginx-upload.example.conf) for ready-to-paste directives (`client_max_body_size`, `proxy_*_timeout`). Reload nginx after editing.
- **413 while picking several photos** — the vendor UI uploads **two images per HTTP request by default** so small proxy limits still work. After you raise nginx body size, you can rebuild with **`VITE_UPLOAD_IMAGE_CHUNK=10`** (or up to **20**) in `packages/frontend/.env` to send more photos per request.
- **Production uploads (other platforms)** — **Azure App Service**, **IIS**, **Cloudflare**, and other hosts enforce their own request body limits; if 413 persists after nginx changes, check that layer’s documentation for upload / body size caps.
