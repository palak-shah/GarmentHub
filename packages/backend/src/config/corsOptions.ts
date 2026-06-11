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

function isLanHttpOrigin(origin: string): boolean {
  if (!/^https?:\/\//i.test(origin)) return false;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host === '127.0.0.1') return false;
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

export function buildCorsOptions(): CorsOptions {
  const listed = env.corsOrigins;
  const allowLan = env.corsAllowLanOrigins;
  if (listed.length === 0 && !allowLan) {
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
      if (allowLan && isLanHttpOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  };
}
