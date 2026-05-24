import api from './client';
import type { ApiResponse, Product, PaginatedResponse, FilterOptions, Category, FeedResponse, TraderGalleryProduct } from '@/types';

export interface ProductQuery {
  search?: string;
  vendorId?: string;
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

  /** Trader photo grid only — smaller/faster than `getById`. */
  getTraderGallery: (id: string) =>
    api.get<ApiResponse<TraderGalleryProduct>>(`/products/${id}/gallery`).then((r) => r.data.data),
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

  bulkUpdate: (ids: string[], updates: { categoryId?: string; moq?: number; status?: string }) =>
    api.put<ApiResponse<{ updated: number }>>('/products/bulk-update', { ids, ...updates }).then((r) => r.data.data),

  getCategories: () =>
    api.get<ApiResponse<Category[]>>('/products/categories').then((r) => r.data.data),

  getFilters: () =>
    api.get<ApiResponse<FilterOptions>>('/products/filters').then((r) => r.data.data),

  feed: (params: { cursor?: string; limit?: number; categoryId?: string } = {}) =>
    api.get<ApiResponse<FeedResponse>>('/products/feed', { params }).then((r) => r.data.data),

  saveProduct: (productId: string) =>
    api.post<ApiResponse<null>>('/products/save', { productId }).then((r) => r.data),

  unsaveProduct: (productId: string) =>
    api.delete<ApiResponse<null>>(`/products/save/${productId}`).then((r) => r.data),

  getSavedProducts: () =>
    api.get<ApiResponse<Product[]>>('/products/saved').then((r) => r.data.data),
};
