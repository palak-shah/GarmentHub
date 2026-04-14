import api from './client';
import type { ApiResponse, OrderItem } from '@/types';

export interface VendorResponsePayload {
  action: 'ACCEPT' | 'REJECT' | 'ALTER';
  alteredQty?: number;
  note?: string;
}

export const vendorApi = {
  getIncomingOrders: () =>
    api.get<ApiResponse<OrderItem[]>>('/vendor/orders').then((r) => r.data.data),

  respondToItem: (itemId: string, data: VendorResponsePayload) =>
    api.put<ApiResponse<OrderItem>>(`/vendor/orders/items/${itemId}/respond`, data).then((r) => r.data.data),
};
