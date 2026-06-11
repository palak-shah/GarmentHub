import axios from 'axios';

type ErrorPayload = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

const clientDebug = import.meta.env.VITE_CLIENT_DEBUG === 'true';

function trimStr(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function messageFromPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as ErrorPayload;
  const direct = trimStr(o.error) ?? trimStr(o.message);
  if (direct) {
    if (direct === 'Validation failed' && Array.isArray(o.details) && o.details.length > 0) {
      const first = o.details[0] as { message?: string };
      const dMsg = trimStr(first?.message);
      if (dMsg) return `${direct}: ${dMsg}`;
    }
    return direct;
  }
  if (Array.isArray(o.details) && o.details.length > 0) {
    const first = o.details[0] as { message?: string };
    const dMsg = trimStr(first?.message);
    if (dMsg) return dMsg;
  }
  return null;
}

function axiosRequestPath(err: { config?: { baseURL?: string; url?: string } }): string | null {
  const c = err.config;
  if (!c) return null;
  const base = (c.baseURL ?? '').replace(/\/$/, '');
  const u = c.url ?? '';
  const path = u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
  return path || null;
}

function normalizeResponseData(data: unknown): unknown {
  if (typeof data === 'string') {
    const t = data.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return JSON.parse(t) as unknown;
      } catch {
        return data;
      }
    }
    return data;
  }
  return data;
}

function truncate(s: string, max = 2000): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… [truncated, ${s.length} chars]`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function redactHeaders(h: unknown): unknown {
  if (!h || typeof h !== 'object') return h;
  if (typeof (h as { toJSON?: () => unknown }).toJSON === 'function') {
    try {
      h = (h as { toJSON: () => unknown }).toJSON();
    } catch {
      return '<unserializable headers>';
    }
  }
  if (typeof h !== 'object' || h === null) return h;
  const out: Record<string, unknown> = { ...(h as Record<string, unknown>) };
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === 'authorization' || k.toLowerCase() === 'cookie') {
      out[k] = '<redacted>';
    }
  }
  return out;
}

/** Technical details for developers when `VITE_CLIENT_DEBUG=true`. */
export function formatAxiosLikeDebug(err: unknown): string {
  const lines: string[] = [];

  if (axios.isAxiosError(err)) {
    lines.push('AxiosError');
    lines.push(`code: ${err.code ?? '(none)'}`);
    lines.push(`message: ${err.message}`);
    if (err.config) {
      lines.push(`method: ${String(err.config.method ?? '?').toUpperCase()}`);
      lines.push(`url: ${axiosRequestPath(err) ?? '(unknown)'}`);
      lines.push(`headers: ${truncate(safeJson(redactHeaders(err.config.headers)), 1500)}`);
    }
    lines.push(`status: ${err.response?.status ?? '(no response)'}`);
    lines.push(`response.data: ${truncate(safeJson(normalizeResponseData(err.response?.data)), 2000)}`);
    if (err.stack) lines.push(`stack:\n${err.stack}`);
    return lines.join('\n');
  }

  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as {
      message?: string;
      config?: { method?: string; baseURL?: string; url?: string; headers?: unknown };
      response?: { status?: number; data?: unknown };
      stack?: string;
    };
    const r = ax.response;
    if (r) {
      lines.push('axios-like error');
      lines.push(`message: ${ax.message ?? '(none)'}`);
      if (ax.config) {
        lines.push(`method: ${String(ax.config.method ?? '?').toUpperCase()}`);
        lines.push(`url: ${axiosRequestPath(ax as { config?: { baseURL?: string; url?: string } }) ?? '(unknown)'}`);
        lines.push(`headers: ${truncate(safeJson(redactHeaders(ax.config.headers)), 1500)}`);
      }
      lines.push(`status: ${r.status ?? '(none)'}`);
      lines.push(`response.data: ${truncate(safeJson(normalizeResponseData(r.data)), 2000)}`);
      if (ax.stack) lines.push(`stack:\n${ax.stack}`);
      return lines.join('\n');
    }
  }

  if (err instanceof Error) {
    lines.push(err.name);
    lines.push(err.message);
    if (err.stack) lines.push(`stack:\n${err.stack}`);
    return lines.join('\n');
  }

  return truncate(String(err), 4000);
}

function apiErrorUserMessage(err: unknown, fallback: string): string {
  if (trimStr(err instanceof Error ? err.message : null) === 'Network Error') {
    return 'Network error — check your connection';
  }

  if (axios.isAxiosError(err)) {
    if (!err.response && err.request) {
      return 'No response from server — is the API running and reachable (e.g. port 4000)?';
    }
    const status = err.response?.status;
    const raw = err.response?.data;
    const data = normalizeResponseData(raw);

    const fromBody = messageFromPayload(data);
    if (fromBody) {
      if (fromBody === 'Insufficient permissions' || fromBody === 'Forbidden') {
        return 'You do not have permission for this action. Check that you are signed in with the correct role.';
      }
      return fromBody;
    }

    if (typeof data === 'string' && data.length > 0 && data.length < 300 && !data.includes('<!DOCTYPE')) {
      return data.trim();
    }

    if (status != null) {
      if (status === 404) {
        const path = axiosRequestPath(err);
        return path
          ? `Not found (404): ${path}. Start the API (e.g. npm run backend:dev), ensure it listens on port 4000, and open the app via the Vite dev server (port 3000) so /api is proxied.`
          : 'Not found (404). Start the API on port 4000 and use the Vite dev server so requests go to /api on the backend.';
      }
      if (status === 502 || status === 503) return `Server unavailable (${status}). Try again in a moment.`;
      if (status >= 500) {
        const fallback500 =
          trimStr((data as ErrorPayload)?.error) ??
          (typeof data === 'string' && data.length > 0 && data.length < 500 && !data.includes('<!DOCTYPE')
            ? data.trim()
            : null);
        if (fallback500) return fallback500;
        return 'Server error (500). Check the API terminal for details.';
      }
      return `Request failed (${status})`;
    }
  }

  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: unknown; status?: number } }).response;
    if (r) {
      const data = normalizeResponseData(r.data);
      const fromBody = messageFromPayload(data);
      if (fromBody) return fromBody;
      if (r.status != null) {
        if (r.status === 404) {
          const path = axiosRequestPath(err as { config?: { baseURL?: string; url?: string } });
          return path
            ? `Not found (404): ${path}. Start the API (e.g. npm run backend:dev), ensure it listens on port 4000, and open the app via the Vite dev server (port 3000) so /api is proxied.`
            : 'Not found (404). Start the API on port 4000 and use the Vite dev server so requests go to /api on the backend.';
        }
        if (r.status >= 500) {
          const d = normalizeResponseData(r.data);
          const fromBody500 = messageFromPayload(d);
          if (fromBody500) return fromBody500;
          const rawErr =
            d && typeof d === 'object' && 'error' in d ? trimStr((d as ErrorPayload).error) : null;
          if (rawErr) return rawErr;
        }
        return `Request failed (${r.status})`;
      }
    }
  }

  if (err instanceof Error && err.message && err.message !== 'Error') {
    return err.message;
  }

  return fallback;
}

/**
 * Reads GarmentHub API error JSON from axios (or axios-like) failures.
 * Does not rely solely on `axios.isAxiosError` — duplicate axios copies in the bundle can break that check.
 *
 * When `VITE_CLIENT_DEBUG=true`, appends a technical block (see `formatAxiosLikeDebug`).
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const user = apiErrorUserMessage(err, fallback);
  if (!clientDebug) return user;
  const detail = formatAxiosLikeDebug(err).trim();
  if (!detail) return user;
  return `${user}\n\n---\n${detail}`;
}
