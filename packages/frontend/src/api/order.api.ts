import api from './client';
import type { ApiResponse, Order, OrderItem } from '@/types';

export interface CreateOrderPayload {
  items: { productId: string; quantity: number; productImageId?: string }[];
  traderId?: string;
  orderMode?: 'DIRECT' | 'MANAGED';
  note?: string;
  /** Optional `YYYY-MM-DD` — need-by end of that day UTC. */
  customerNeedBy?: string;
}

export const orderApi = {
  create: (data: CreateOrderPayload) =>
    api.post<ApiResponse<Order>>('/orders', data).then((r) => r.data.data),

  list: () =>
    api.get<ApiResponse<Order[] | OrderItem[]>>('/orders').then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data.data),

  confirm: (id: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/confirm`).then((r) => r.data.data),

  modifyItems: (id: string, items: { itemId: string; requestedQty: number }[]) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/modify`, { items }).then((r) => r.data.data),

  cancel: (id: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/cancel`).then((r) => r.data.data),

  traderAlerts: () =>
    api.get<ApiResponse<(Order & { alertType: string; pendingCount: number; rejectedCount: number })[]>>('/orders/trader/alerts').then((r) => r.data.data),

  takeControl: (id: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/take-control`).then((r) => r.data.data),

  releaseToVendors: (id: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/release-to-vendors`).then((r) => r.data.data),

  traderAdjust: (
    id: string,
    body: {
      items?: { itemId: string; requestedQty?: number; unitPrice?: number | null }[];
      note?: string | null;
    },
  ) => api.post<ApiResponse<Order>>(`/orders/${id}/trader-adjust`, body).then((r) => r.data.data),

  setTraderCounterPrice: (itemId: string, unitPrice: number) =>
    api.put<ApiResponse<OrderItem>>(`/orders/items/${itemId}/counter-price`, { unitPrice }).then((r) => r.data.data),
};
