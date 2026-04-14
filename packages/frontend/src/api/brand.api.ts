import api from './client';
import type { ApiResponse, Brand } from '@/types';

export const brandApi = {
  listAll: () =>
    api.get<ApiResponse<Brand[]>>('/brands').then((r) => r.data.data),

  listMy: () =>
    api.get<ApiResponse<Brand[]>>('/brands/my').then((r) => r.data.data),

  create: (name: string) =>
    api.post<ApiResponse<Brand>>('/brands', { name }).then((r) => r.data.data),

  update: (id: string, name: string) =>
    api.put<ApiResponse<Brand>>(`/brands/${id}`, { name }).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/brands/${id}`).then((r) => r.data),
};
