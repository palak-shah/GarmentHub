/**
 * Resolves stored paths like `/uploads/products/...` for `<img src>`.
 * Set `VITE_PUBLIC_API_ORIGIN` when media must load from a specific host; if unset, `VITE_API_ORIGIN` is used.
 */
export function mediaUrl(src: string | undefined | null): string {
  if (src == null || src === '') return '';
  const s = src.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  const apiOrigin =
    import.meta.env.VITE_PUBLIC_API_ORIGIN?.replace(/\/$/, '') ||
    import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, '');
  if (apiOrigin) return `${apiOrigin}${path}`;
  return path;
}

/**
 * Returns the thumbnail URL for a product image.
 * Convention: `/uploads/products/abc.jpg` → `/uploads/thumbs/abc.jpg`
 */
export function thumbUrl(src: string | undefined | null): string {
  if (src == null || src === '') return '';
  const thumb = src.replace('/uploads/products/', '/uploads/thumbs/');
  return mediaUrl(thumb);
}
