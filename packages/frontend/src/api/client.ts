import axios, { AxiosHeaders } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { clearSessionQueryData } from '@/lib/sessionQueries';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Drop JSON content-type for FormData so transformRequest does not stringify the body.
  if (config.data instanceof FormData) {
    const h = AxiosHeaders.from(config.headers);
    h.setContentType(false);
    config.headers = h;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      clearSessionQueryData();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
