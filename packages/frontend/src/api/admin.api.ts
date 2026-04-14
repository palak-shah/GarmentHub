import api from './client';
import type { ApiResponse, AdminStats, AdminUser, Order, Category } from '@/types';

export const adminApi = {
  getUsers: (role?: string) =>
    api.get<ApiResponse<AdminUser[]>>('/admin/users', { params: role ? { role } : {} }).then((r) => r.data.data),

  toggleUserStatus: (id: string, isActive: boolean) =>
    api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, { isActive }).then((r) => r.data.data),

  getAllOrders: () =>
    api.get<ApiResponse<Order[]>>('/admin/orders').then((r) => r.data.data),

  getStats: () =>
    api.get<ApiResponse<AdminStats>>('/admin/stats').then((r) => r.data.data),

  createCategory: (name: string) =>
    api.post<ApiResponse<Category>>('/admin/categories', { name }).then((r) => r.data.data),

  updateCategory: (id: string, name: string) =>
    api.put<ApiResponse<Category>>(`/admin/categories/${id}`, { name }).then((r) => r.data.data),

  deleteCategory: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/categories/${id}`).then((r) => r.data),
};
