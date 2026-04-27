import api from './client';
import type { ApiResponse, Notification } from '@/types';

export const notificationApi = {
  list: (unread = false) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params: { unread } }).then((r) => r.data.data),

  unreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count').then((r) => r.data.data),

  markRead: (id: string) =>
    api.put<ApiResponse<unknown>>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.put<ApiResponse<unknown>>('/notifications/read-all').then((r) => r.data),
};
