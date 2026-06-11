# GarmentHub frontend (Vite + React PWA)

See repo root [`README`](../../README.md) for workspace scripts (`npm run frontend:dev`, etc.).

## Environment

Copy [`.env.example`](.env.example) to `.env` and adjust. Client-exposed variables must use the `VITE_` prefix.

### Client debug (on-screen error details)

**Concept:** “client debug” means richer, technical error text for developers. The **flag name differs** from Flutter mobile: here it is `VITE_CLIENT_DEBUG` (Vite exposes only `VITE_*` to the client).

Set `VITE_CLIENT_DEBUG=true` in `.env` (or inline for one run) to:

- Append technical HTTP details to API-related messages from [`src/utils/apiError.ts`](src/utils/apiError.ts).
- Show full exception message and stack in the global [`ErrorBoundary`](src/components/ErrorBoundary.tsx).
- Register [`ClientDebugGlobalPanel`](src/debug/ClientDebugGlobalPanel.tsx) so **uncaught** `window` `error` events and **unhandled promise rejections** appear in a fixed bottom panel (truncated), not only in the console.

Default is off — keep it off for production builds you ship to end users.

```bash
VITE_CLIENT_DEBUG=true npm run dev -w packages/frontend
```

**Flutter (same idea, different define):** use `--dart-define=CLIENT_DEBUG=true` in `packages/mobile` — see [`packages/mobile/README.md`](../mobile/README.md#client-debug-flutter).
