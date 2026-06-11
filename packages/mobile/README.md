# GarmentHub Mobile (Flutter)

Aligned with [`packages/frontend`](../frontend): same API, roles, and journeys.

**iPhone testing:** iOS builds require a **Mac + Xcode** (not Ubuntu). Step-by-step: [`doc/ios_device_testing.md`](doc/ios_device_testing.md).

**This doc uses only this workspace layout and this API URL:**

| What | Value |
|------|--------|
| Project folder | `/home/Palak/garmenthub/packages/mobile` |
| SSH user@host | `Palak@garment-hub` |
| API base (same machine only) | `http://127.0.0.1:4000/api` |

## API base URL

The backend serves JSON under `/api` (see `packages/backend/src/index.ts`).

**Same machine** (browser on the server, or Linux desktop app on the server):

```bash
cd /home/Palak/garmenthub/packages/mobile
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:4000/api
```

**Browser on your Windows PC** hitting Flutter web on the **Ubuntu** host: `127.0.0.1` in the app points at **your PC**, not the server. Build/run with the **server’s hostname or IP** (port from `npm run backend:dev`, usually `4000`):

```bash
flutter build web --dart-define=API_BASE_URL=http://garment-hub:4000/api
# or: http://YOUR_SERVER_PUBLIC_IP:4000/api
```

### Web login does nothing / “no response”

1. **Browser devtools (F12) → Network** — click **Send OTP** and see if `send-otp` is **red** (failed) or missing. If the console shows **CORS** on the preflight (`OPTIONS`), the response must include `Access-Control-Allow-Origin` for your page origin (e.g. `http://localhost:58334`). The API uses [`packages/backend/src/config/corsOptions.ts`](../backend/src/config/corsOptions.ts): when `CORS_ORIGINS` is non-empty, listed origins **plus** any `http://localhost:<port>` / `http://127.0.0.1:<port>` are allowed for local Flutter web / Vite. **Deploy** that backend build and restart the process behind `service.garmenthub.in`, then confirm in DevTools: `OPTIONS` then `POST`/`GET` show the matching `Access-Control-Allow-Origin` header.

2. **403 vs CORS** — If the request appears in Network with status **403**, the browser reached the API; that is usually **authorization** (wrong role or missing token), not CORS. Example: `GET /workflow/*` is **TRADER-only**; customers must use `/products/feed` and `/curation/received` on home (see `lib/features/home/`).

3. **`API_BASE_URL`** must be reachable **from the browser** (not only from the server). Use `http://<same-host-as-browser-sees-for-api>:4000/api` and ensure port `4000` is open if you test from another machine.

4. Confirm the API is up: open `https://service.garmenthub.in/api/health` (or your host) in the browser — you should see JSON `status: ok`.

- **Android emulator** (same machine): if `API_BASE_URL` is empty, the app defaults to `http://10.0.2.2:4000/api`.

## Client debug (on-screen error details)

Compile-time flag: `--dart-define=CLIENT_DEBUG=true`. When enabled, API/network error toasts and inline messages append a **technical** section (request URL, status, truncated body, Dio details). Default is **off** — keep it off for production APK/IPA/Web builds you give to end users.

```bash
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://127.0.0.1:4000/api \
  --dart-define=CLIENT_DEBUG=true
```

```bash
flutter build apk --release \
  --dart-define=API_BASE_URL=https://service.garmenthub.in/api \
  --dart-define=CLIENT_DEBUG=true
```

## Linux desktop + Snap Flutter

If you use Flutter from **Snap** (`/snap/bin/flutter`) and `flutter run -d linux` fails at link time with undefined references from `libsecret` / GLib (for example `g_task_set_static_name`), that is a **toolchain vs host library mismatch**, not a missing `apt` package.

This project stores the session with **`shared_preferences`** so the Linux binary does not link `flutter_secure_storage`’s `libsecret` plugin.

### Linux desktop runtime (on `garment-hub`)

```bash
sudo apt-get install -y libgtk-3-0 libepoxy0
```

You need a **display** (`DISPLAY` set). On `garment-hub` over SSH, use X11 forwarding below, or run `flutter run -d chrome` from `/home/Palak/garmenthub/packages/mobile` with the same `--dart-define=API_BASE_URL=http://127.0.0.1:4000/api`.

### SSH X11 forwarding to `garment-hub`

From your **local** machine (XQuartz / VcXsrv / Linux desktop):

```bash
ssh -Y Palak@garment-hub
echo "$DISPLAY"
```

Expect a non-empty value (e.g. `localhost:10.0`). If empty, fix `/etc/ssh/sshd_config` on **garment-hub** (`X11Forwarding yes`) and restart `sshd`.

```bash
sudo apt-get install -y xauth x11-apps
xclock
```

Then on **garment-hub**:

```bash
cd /home/Palak/garmenthub/packages/mobile
flutter run -d linux --dart-define=API_BASE_URL=http://127.0.0.1:4000/api
```

If the window is blank over the tunnel: `export LIBGL_ALWAYS_INDIRECT=1` in that same shell before `flutter run`.

## Analyze / test

```bash
cd /home/Palak/garmenthub/packages/mobile
flutter analyze --no-fatal-infos
flutter test
```
