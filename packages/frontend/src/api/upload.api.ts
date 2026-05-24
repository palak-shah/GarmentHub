import { useAuthStore } from '@/store/authStore';
import { clearSessionQueryData } from '@/lib/sessionQueries';
import type { ApiResponse } from '@/types';

/**
 * Product image uploads use `fetch` (not axios). Axios merges default
 * `Content-Type: application/json` and `transformRequest` can stringify `FormData`,
 * which breaks multipart parsing on the server (Multer sees no files).
 * With `fetch` + `FormData`, the browser sets `multipart/form-data` and the boundary.
 */
export const uploadApi = {
  /** When `productId` is set, the server appends images to that product and refreshes `updatedAt`. */
  postProductImages: async (files: File[], productId?: string): Promise<{ urls: string[] }> => {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error('You are not signed in. Log in as a vendor to upload images.');
    }

    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f);
    }
    if (productId?.trim()) {
      fd.append('productId', productId.trim());
    }

    let res: Response;
    try {
      res = await fetch('/api/upload/images', {
        method: 'POST',
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      const msg =
        e instanceof TypeError
          ? 'Cannot reach the server. Start the API (port 4000) and keep using this app on http://localhost:3000'
          : e instanceof Error
            ? e.message
            : 'Network error';
      throw new Error(msg);
    }

    const text = await res.text();
    const looksHtml = /^\s*</.test(text) && /<\s*html/i.test(text);

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      if (res.status === 413) {
        throw new Error(
          'Upload rejected: the reverse proxy body limit is too small (common nginx default 1m). Add `client_max_body_size 100m;` (see packages/backend/docs/nginx-upload.example.conf) and reload nginx. If this still appears with only one photo, check another proxy layer (Cloudflare, host panel).',
        );
      }
      if (res.status === 502 || res.status === 504) {
        throw new Error(
          'Upload failed: gateway or upstream timeout (502/504). The request may be too large; try 2–3 photos per batch.',
        );
      }
      if (looksHtml) {
        throw new Error(
          'Upload failed: the server returned an HTML error page instead of JSON — often a proxy body-size limit (413) or gateway issue, not a stopped API. Try uploading 2–3 photos at a time. On nginx, increase `client_max_body_size` for your API. For local dev, use the Vite app on port 3000 with `npm run backend:dev` on port 4000.',
        );
      }
      throw new Error(text.trim().slice(0, 240) || `Upload failed (${res.status})`);
    }

    if (res.status === 401) {
      useAuthStore.getState().logout();
      clearSessionQueryData();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (res.status === 403) {
      throw new Error(
        'Only vendor accounts can upload product images. Log out and sign in with a vendor phone (e.g. demo 9999900001).',
      );
    }

    const body = json as ApiResponse<{ urls: string[] }> & { success?: boolean; error?: string };

    if (!res.ok || body.success === false) {
      throw new Error(body.error || `Upload failed (${res.status})`);
    }

    if (body.success !== true || body.data == null || !Array.isArray(body.data.urls)) {
      throw new Error('Invalid response from server (expected { success, data: { urls } })');
    }

    return body.data;
  },
};
