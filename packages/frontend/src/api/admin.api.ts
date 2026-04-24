import api from './client';
import type { ApiResponse, AdminStats, AdminUser, Order, AdminCategory, CategoryAttribute } from '@/types';

export const adminApi = {
  getUsers: (role?: string) =>
    api.get<ApiResponse<AdminUser[]>>('/admin/users', { params: role ? { role } : {} }).then((r) => r.data.data),

  toggleUserStatus: (id: string, isActive: boolean) =>
    api.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, { isActive }).then((r) => r.data.data),

  getAllOrders: () =>
    api.get<ApiResponse<Order[]>>('/admin/orders').then((r) => r.data.data),

  getStats: () =>
    api.get<ApiResponse<AdminStats>>('/admin/stats').then((r) => r.data.data),

  getCategories: () =>
    api.get<ApiResponse<AdminCategory[]>>('/admin/categories').then((r) => r.data.data),

  createCategory: (name: string, attributes?: { name: string; sortOrder?: number }[]) =>
    api.post<ApiResponse<AdminCategory>>('/admin/categories', { name, attributes }).then((r) => r.data.data),

  updateCategory: (id: string, name: string) =>
    api.put<ApiResponse<AdminCategory>>(`/admin/categories/${id}`, { name }).then((r) => r.data.data),

  deleteCategory: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/categories/${id}`).then((r) => r.data),

  createCategoryAttribute: (categoryId: string, name: string, sortOrder?: number) =>
    api
      .post<ApiResponse<CategoryAttribute>>(`/admin/categories/${categoryId}/attributes`, { name, sortOrder })
      .then((r) => r.data.data),

  updateCategoryAttribute: (
    categoryId: string,
    attributeId: string,
    data: { name?: string; sortOrder?: number },
  ) =>
    api
      .put<ApiResponse<CategoryAttribute>>(
        `/admin/categories/${categoryId}/attributes/${attributeId}`,
        data,
      )
      .then((r) => r.data.data),

  deleteCategoryAttribute: (categoryId: string, attributeId: string) =>
    api.delete<ApiResponse<null>>(`/admin/categories/${categoryId}/attributes/${attributeId}`).then((r) => r.data),
};
