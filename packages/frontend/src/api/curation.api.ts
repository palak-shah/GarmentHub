import api from './client';
import type { ApiResponse, CuratedShare } from '@/types';

export interface CreateSharePayload {
  productIds?: string[];
  /** Preferred: per-line optional trader offer price when sending to customers. */
  products?: { productId: string; traderOfferUnitPrice?: number | null }[];
  customerIds: string[];
  note?: string;
  orderMode?: 'DIRECT' | 'MANAGED';
}

export interface TraderCustomer {
  id: string;
  name: string;
  businessName?: string;
  role: string;
}

/** Trader’s outbound curated shares (for “Shared with …” on workflow tab). */
export interface SentCuratedShare {
  id: string;
  note?: string | null;
  orderMode: string;
  createdAt: string;
  products: {
    product: { id: string; name: string; images: string[]; price?: number | null };
    traderOfferUnitPrice?: number | null;
  }[];
  recipients: { customer: { id: string; name: string; businessName?: string | null } }[];
}

export const curationApi = {
  createShare: (data: CreateSharePayload) =>
    api.post<ApiResponse<unknown>>('/curation/share', data).then((r) => {
      const body = r.data;
      if (!body || typeof body !== 'object' || body.success !== true) {
        throw new Error('Unexpected response from share API');
      }
      return body.data;
    }),

  listSent: () =>
    api.get<ApiResponse<SentCuratedShare[]>>('/curation/sent').then((r) => r.data.data),

  listReceived: () =>
    api.get<ApiResponse<CuratedShare[]>>('/curation/received').then((r) => r.data.data),

  markRead: (shareId: string) =>
    api.put<ApiResponse<unknown>>(`/curation/read/${shareId}`).then((r) => r.data),

  getCustomers: () =>
    api.get<ApiResponse<TraderCustomer[]>>('/curation/customers').then((r) => r.data.data),
};
