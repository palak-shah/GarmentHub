/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API host (no `/api` suffix), e.g. `https://service.garmenthub.in` or `http://localhost:4000`. */
  readonly VITE_API_ORIGIN?: string;
  /** Origin for `/uploads` URLs in `<img src>`. Defaults to `VITE_API_ORIGIN` when that is set. */
  readonly VITE_PUBLIC_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
