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
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      const hint =
        text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')
          ? 'The server returned a page instead of JSON — is the backend running on port 4000?'
          : text.slice(0, 200) || 'Upload failed';
      throw new Error(hint);
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
