# GarmentHub frontend (Vite + React PWA)

See repo root [`README`](../../README.md) for workspace scripts (`npm run frontend:dev`, etc.).

## Environment

Copy [`.env.example`](.env.example) to `.env` and adjust. Client-exposed variables must use the `VITE_` prefix.

### Client debug (on-screen API error details)

Set `VITE_CLIENT_DEBUG=true` in `.env` (or inline for one run) to append technical HTTP details to messages from [`src/utils/apiError.ts`](src/utils/apiError.ts). Default is off — keep it off for production builds you ship to end users.

```bash
VITE_CLIENT_DEBUG=true npm run dev -w packages/frontend
```

The global [`ErrorBoundary`](src/components/ErrorBoundary.tsx) also hides stack traces unless this flag is true.
