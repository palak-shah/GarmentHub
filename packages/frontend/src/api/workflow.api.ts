import api from './client';
import type { ApiResponse, Product, WorkflowState } from '@/types';

export const workflowApi = {
  markState: (productId: string, state: WorkflowState) =>
    api.post<ApiResponse<unknown>>('/workflow/mark', { productId, state }).then((r) => r.data),

  markBulk: (productIds: string[], state: WorkflowState) =>
    api.post<ApiResponse<{ ok: boolean }>>('/workflow/mark-bulk', { productIds, state }).then((r) => r.data),

  feedByState: (state: WorkflowState, cursor?: string, limit = 20) =>
    api.get<ApiResponse<{ products: Product[]; nextCursor: string | null }>>('/workflow/feed', {
      params: { state, cursor, limit },
    }).then((r) => r.data.data),

  unseen: (limit = 20) =>
    api.get<ApiResponse<Product[]>>('/workflow/unseen', { params: { limit } }).then((r) => r.data.data),

  unseenGrouped: (limit = 40) =>
    api.get<ApiResponse<{ vendor: { id: string; name: string; businessName: string | null }; date: string; products: Product[] }[]>>(
      '/workflow/unseen-grouped', { params: { limit } },
    ).then((r) => r.data.data),

  counts: () =>
    api.get<ApiResponse<Record<string, number>>>('/workflow/counts').then((r) => r.data.data),
};
