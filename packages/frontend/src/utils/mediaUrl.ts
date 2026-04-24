/**
 * Resolves stored paths like `/uploads/products/...` for `<img src>`.
 * When the UI is served without a dev proxy (e.g. `vite preview`) or from another host,
 * set `VITE_PUBLIC_API_ORIGIN=http://localhost:4000` in `.env` so images load from the API.
 */
export function mediaUrl(src: string | undefined | null): string {
  if (src == null || src === '') return '';
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  const apiOrigin = import.meta.env.VITE_PUBLIC_API_ORIGIN?.replace(/\/$/, '');
  if (apiOrigin) return `${apiOrigin}${path}`;
  return path;
}
