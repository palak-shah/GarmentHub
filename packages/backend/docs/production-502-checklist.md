# When `https://service.garmenthub.in` returns 502

Nginx is up but **cannot connect to the Node API** on the upstream (usually `http://127.0.0.1:4000`). Fix it on the **same machine** where nginx runs.

## 1. Is anything listening on 4000?

```bash
ss -tlnp | grep ':4000' || sudo lsof -iTCP:4000 -sTCP:LISTEN
```

No output → the API is not running. Start it (see step 3).

## 2. Nginx error line (confirms “connection refused” vs timeout)

```bash
sudo tail -n 30 /var/log/nginx/error.log
```

`connect() failed (111: Connection refused) ... upstream: "http://127.0.0.1:4000"` means **nothing on 4000**.

## 3. Start the API from this repo

**Development (hot reload):**

```bash
cd /path/to/garmenthub/packages/backend
# .env must have valid DATABASE_URL, JWT_SECRET, etc.
npx tsx watch src/index.ts
```

**Production (recommended):**

```bash
cd /path/to/garmenthub/packages/backend
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
PORT=4000 node dist/index.js
```

Point PM2 (or systemd) at **`node dist/index.js`** with **`cwd`** = `packages/backend` and env loaded from **`.env`** or your secrets manager.

## 4. Deploy the missing `src` tree (if you still use `tsx watch`)

The repo must include:

- `src/index.ts`, `src/config/env.ts`, `src/config/corsOptions.ts`
- `src/services/workflow.service.js` and `src/services/curation.service.js` (or regenerate TS from dist)

If `src/index.ts` is missing on the server, `tsx watch src/index.ts` will crash and nginx will 502.

## 5. Database credentials

If PM2 logs show `Authentication failed against database server` for `postgres`, fix **`DATABASE_URL`** in the environment the process uses, then restart the API.

## 6. Quick local test (on the server)

```bash
curl -sS http://127.0.0.1:4000/api/health
```

Expect JSON `{"status":"ok",...}`. If this fails, nginx will 502 for `/api` too.
