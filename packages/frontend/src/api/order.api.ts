import api from './client';
import type { ApiResponse, Order, OrderItem } from '@/types';

export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
  note?: string;
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
};
