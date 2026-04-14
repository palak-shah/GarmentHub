import api from './client';
import type { ApiResponse, Product, PaginatedResponse, FilterOptions, Category } from '@/types';

export interface ProductQuery {
  search?: string;
  brandId?: string;
  categoryId?: string;
  pattern?: string;
  fabric?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export const productApi = {
  list: (params: ProductQuery = {}) =>
    api.get<ApiResponse<PaginatedResponse<Product>>>('/products', { params }).then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Product>>(`/products/${id}`).then((r) => r.data.data),

  getMyProducts: () =>
    api.get<ApiResponse<Product[]>>('/products/my').then((r) => r.data.data),

  create: (data: FormData | Record<string, unknown>) =>
    api.post<ApiResponse<Product>>('/products', data).then((r) => r.data.data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Product>>(`/products/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/products/${id}`).then((r) => r.data),

  bulkDelete: (ids: string[]) =>
    api.post<ApiResponse<{ deleted: number }>>('/products/bulk-delete', { ids }).then((r) => r.data.data),

  getCategories: () =>
    api.get<ApiResponse<Category[]>>('/products/categories').then((r) => r.data.data),

  getFilters: () =>
    api.get<ApiResponse<FilterOptions>>('/products/filters').then((r) => r.data.data),
};
