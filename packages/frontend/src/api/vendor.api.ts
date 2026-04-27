import api from './client';
import type { ApiResponse, OrderItem, VendorCatalogCategory, CategoryAttribute } from '@/types';

export interface VendorResponsePayload {
  action: 'ACCEPT' | 'REJECT' | 'ALTER';
  alteredQty?: number;
  note?: string;
  offeredUnitPrice?: number;
}

export const vendorApi = {
  getIncomingOrders: () =>
    api.get<ApiResponse<OrderItem[]>>('/vendor/orders').then((r) => r.data.data),

  respondToItem: (itemId: string, data: VendorResponsePayload) =>
    api.put<ApiResponse<OrderItem>>(`/vendor/orders/items/${itemId}/respond`, data).then((r) => r.data.data),

  bulkRespond: (
    responses: Array<{
      itemId: string;
      action: 'ACCEPT' | 'REJECT' | 'ALTER';
      alteredQty?: number;
      offeredUnitPrice?: number;
      note?: string;
    }>,
  ) =>
    api
      .post<ApiResponse<{ updated: number }>>('/vendor/orders/items/bulk-respond', { responses })
      .then((r) => r.data.data),

  respondToTraderPrice: (itemId: string, data: { action: 'ACCEPT' | 'REJECT' }) =>
    api.put<ApiResponse<OrderItem>>(`/vendor/orders/items/${itemId}/price-counter`, data).then((r) => r.data.data),

  getCatalogCategories: () =>
    api.get<ApiResponse<VendorCatalogCategory[]>>('/vendor/categories').then((r) => r.data.data),

  createVendorAttribute: (categoryId: string, name: string, sortOrder?: number) =>
    api
      .post<ApiResponse<CategoryAttribute>>(`/vendor/categories/${categoryId}/attributes`, { name, sortOrder })
      .then((r) => r.data.data),

  updateVendorAttribute: (
    categoryId: string,
    attributeId: string,
    data: { name?: string; sortOrder?: number },
  ) =>
    api
      .put<ApiResponse<CategoryAttribute>>(
        `/vendor/categories/${categoryId}/attributes/${attributeId}`,
        data,
      )
      .then((r) => r.data.data),

  deleteVendorAttribute: (categoryId: string, attributeId: string) =>
    api.delete<ApiResponse<null>>(`/vendor/categories/${categoryId}/attributes/${attributeId}`).then((r) => r.data),
};
