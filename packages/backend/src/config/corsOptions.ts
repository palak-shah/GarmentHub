import type { CorsOptions } from 'cors';
import { env } from './env';

/**
 * Browsers only send `Origin: http://localhost:<port>` for pages served from that host —
 * remote sites cannot spoof this for cross-origin XHR. Allowing these patterns lets
 * Flutter web / Vite dev hit the API when `CORS_ORIGINS` lists production hostnames only.
 */
function isLocalDevBrowserOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function buildCorsOptions(): CorsOptions {
  const listed = env.corsOrigins;
  if (listed.length === 0) {
    return { origin: true };
  }
  const allow = new Set(listed);
  return {
    origin(origin, callback) {
      if (origin == null || origin === 'null' || origin === undefined) {
        callback(null, true);
        return;
      }
      if (allow.has(origin)) {
        callback(null, true);
        return;
      }
      if (isLocalDevBrowserOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
