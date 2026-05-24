import api from './client';
import type { ApiResponse } from '@/types';

export interface StoryUser {
  id: string;
  name: string;
  businessName?: string;
  newCount: number;
}

export interface ConnectionUser {
  id: string;
  name: string;
  businessName?: string;
  role: string;
  phone?: string;
}

export interface TraderInsightsResponse {
  trader: ConnectionUser;
  stats: {
    ordersCount: number;
    uniqueBuyersFromOrders: number;
    buyersFollowingTrader: number;
    curatedShareRecipients: number;
    activeProductsWithTrader: number;
  };
}

export const networkApi = {
  getStories: () =>
    api.get<ApiResponse<StoryUser[]>>('/network/stories').then((r) => r.data.data),

  getConnections: () =>
    api.get<ApiResponse<ConnectionUser[]>>('/network/connections').then((r) => r.data.data),

  getSuggestions: () =>
    api.get<ApiResponse<ConnectionUser[]>>('/network/suggestions').then((r) => r.data.data),

  follow: (userId: string) =>
    api.post<ApiResponse<unknown>>(`/network/follow/${userId}`).then((r) => r.data),

  unfollow: (userId: string) =>
    api.delete<ApiResponse<unknown>>(`/network/unfollow/${userId}`).then((r) => r.data),

  search: (q: string) =>
    api.get<ApiResponse<ConnectionUser[]>>('/network/search', { params: { q } }).then((r) => r.data.data),

  getInviteCode: () =>
    api.get<ApiResponse<{ code: string }>>('/network/invite-code').then((r) => r.data.data),

  connectViaInvite: (code: string) =>
    api.post<ApiResponse<{ id: string; name: string; businessName?: string }>>('/network/connect-invite', { code }).then((r) => r.data.data),

  /** Vendor: link an existing trader on GarmentHub (search). Use share invite for people not on the app. */
  connectTrader: (traderId: string) =>
    api.post<ApiResponse<unknown>>(`/network/connect-trader/${traderId}`).then((r) => r.data),

  getTraderInsights: (traderId: string) =>
    api.get<ApiResponse<TraderInsightsResponse>>(`/network/traders/${traderId}/insights`).then((r) => r.data.data),
};
