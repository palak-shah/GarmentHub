import type { OrderStatus, ItemStatus } from '@/types';

export function formatPrice(price?: number | null): string {
  if (price == null) return 'Price on request';
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  PARTIALLY_ACCEPTED: { label: 'Partial', color: 'bg-blue-100 text-blue-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
};

export const itemStatusConfig: Record<ItemStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  ALTERED: { label: 'Altered', color: 'bg-orange-100 text-orange-800' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800' },
};

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
