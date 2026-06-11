/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API host (no `/api` suffix), e.g. `https://service.garmenthub.in` or `http://localhost:4000`. */
  readonly VITE_API_ORIGIN?: string;
  /** Origin for `/uploads` URLs in `<img src>`. Defaults to `VITE_API_ORIGIN` when that is set. */
  readonly VITE_PUBLIC_API_ORIGIN?: string;
  /**
   * When `'true'`, API error toasts/messages append technical details (URL, status, body snippet).
   * Default off — do not enable in production builds you ship to end users.
   */
  readonly VITE_CLIENT_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
