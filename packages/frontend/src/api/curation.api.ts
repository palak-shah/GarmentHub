import api from './client';
import type { ApiResponse, CuratedShare, Product, OrderMode } from '@/types';

export interface CreateSharePayload {
  productIds?: string[];
  /** Preferred: per-line optional trader offer price when sending to customers. */
  products?: {
    productId: string;
    productImageId?: string;
    traderOfferUnitPrice?: number | null;
  }[];
  customerIds?: string[];
  /** Recipients = union of these groups’ members (must follow you). */
  customerGroupIds?: string[];
  note?: string;
  orderMode?: 'DIRECT' | 'MANAGED';
}

export interface TraderCustomer {
  id: string;
  name: string;
  businessName?: string;
  role: string;
}

export interface CustomerGroupListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { members: number };
}

export interface CustomerGroupMemberRow {
  id: string;
  customerId: string;
  customer: TraderCustomer;
}

export interface CustomerGroupDetail {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: CustomerGroupMemberRow[];
}

/** Minimal POST /curation/share response (Prisma share; UI may use id and nested products). */
export interface CreateShareResult {
  id: string;
  products?: {
    product: { id: string; name: string; images?: string[] };
    traderOfferUnitPrice?: number | null;
    productImageId?: string | null;
  }[];
}

/** Response for GET /curation/shared-photos/:productId (customer). */
export interface CustomerSharedPhotoEntry {
  id: string;
  url: string;
  createdAt: string;
  sharedAt: string;
  shareId: string;
  orderMode: OrderMode;
  traderId: string;
  trader: { id: string; name: string; businessName?: string | null };
  traderOfferUnitPrice: number | null;
}

export interface CustomerSharedPhotosResponse {
  product: Product;
  photos: CustomerSharedPhotoEntry[];
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
    api.post<ApiResponse<CreateShareResult>>('/curation/share', data).then((r) => {
      const body = r.data;
      if (!body || typeof body !== 'object' || body.success !== true) {
        throw new Error('Unexpected response from share API');
      }
      return body.data as CreateShareResult;
    }),

  listSent: () =>
    api.get<ApiResponse<SentCuratedShare[]>>('/curation/sent').then((r) => r.data.data),

  listReceived: () =>
    api.get<ApiResponse<CuratedShare[]>>('/curation/received').then((r) => r.data.data),

  getSharedPhotosForProduct: (productId: string) =>
    api
      .get<ApiResponse<CustomerSharedPhotosResponse>>(`/curation/shared-photos/${productId}`)
      .then((r) => r.data.data),

  markRead: (shareId: string) =>
    api.put<ApiResponse<unknown>>(`/curation/read/${shareId}`).then((r) => r.data),

  getCustomers: () =>
    api.get<ApiResponse<TraderCustomer[]>>('/curation/customers').then((r) => r.data.data),

  listCustomerGroups: () =>
    api.get<ApiResponse<CustomerGroupListItem[]>>('/curation/groups').then((r) => r.data.data),

  getCustomerGroup: (groupId: string) =>
    api.get<ApiResponse<CustomerGroupDetail>>(`/curation/groups/${groupId}`).then((r) => r.data.data),

  createCustomerGroup: (body: { name: string }) =>
    api.post<ApiResponse<CustomerGroupListItem>>('/curation/groups', body).then((r) => r.data.data as CustomerGroupListItem),

  updateCustomerGroup: (groupId: string, body: { name: string }) =>
    api
      .patch<ApiResponse<CustomerGroupListItem>>(`/curation/groups/${groupId}`, body)
      .then((r) => r.data.data as CustomerGroupListItem),

  deleteCustomerGroup: (groupId: string) =>
    api.delete<ApiResponse<unknown>>(`/curation/groups/${groupId}`).then((r) => r.data),

  addCustomerGroupMembers: (groupId: string, body: { customerIds: string[] }) =>
    api
      .post<ApiResponse<CustomerGroupDetail>>(`/curation/groups/${groupId}/members`, body)
      .then((r) => r.data.data as CustomerGroupDetail),

  removeCustomerGroupMember: (groupId: string, customerId: string) =>
    api
      .delete<ApiResponse<unknown>>(`/curation/groups/${groupId}/members/${customerId}`)
      .then((r) => r.data),
};
