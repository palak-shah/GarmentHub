import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, Package } from 'lucide-react';
import { vendorApi, type VendorResponsePayload } from '@/api/vendor.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemStatusConfig, formatDate, formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import { useAuthStore } from '@/store/authStore';
import type { OrderItem } from '@/types';

type OrderFilter = 'all' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONFIRMED';

function offeredQtyLabel(status: OrderItem['status']): string {
  if (status === 'CONFIRMED') return 'Confirmed quantity';
  if (status === 'ALTERED') return 'Offered quantity';
  return 'Accepted quantity';
}

export default function IncomingOrders() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [alterModal, setAlterModal] = useState<OrderItem | null>(null);
  const [alteredQty, setAlteredQty] = useState('');
  const [alterNote, setAlterNote] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('PENDING');

  const { data: items, isLoading } = useQuery({
    queryKey: ['vendor-orders', userId],
    queryFn: () => vendorApi.getIncomingOrders(),
    enabled: !!userId,
  });

  const respond = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: VendorResponsePayload }) =>
      vendorApi.respondToItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast.success('Response recorded');
      setAlterModal(null);
    },
    onError: () => toast.error('Failed to respond'),
  });

  const filtered = items?.filter((i) => filter === 'all' || i.status === filter) || [];

  const emptyDescription: Record<OrderFilter, string> = {
    all: 'No order items yet',
    PENDING: 'No pending orders to respond to',
    ACCEPTED: 'No accepted order lines',
    REJECTED: 'No rejected order lines',
    CONFIRMED: 'No confirmed order lines (buyer confirmed an offered quantity)',
  };

  const filterChips: { key: OrderFilter; label: string }[] = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'all', label: 'All' },
  ];

  return (
    <>
      <Header title="Incoming Orders" />
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {filterChips.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                filter === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!userId || isLoading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="No orders" description={emptyDescription[filter]} />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const statusCfg = itemStatusConfig[item.status];
              return (
                <div key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.images?.[0] ? (
                        <img src={mediaUrl(item.product.images[0])} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">
                        From: {item.order?.customer.businessName || item.order?.customer.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(item.order?.createdAt || item.createdAt!)}</p>
                    </div>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </div>

                  <div className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Requested: </span>
                        <span className="font-semibold">{item.requestedQty} units</span>
                      </div>
                      {item.product.price && (
                        <span className="shrink-0 text-xs text-gray-500">{formatPrice(item.product.price)}/unit</span>
                      )}
                    </div>
                    {item.acceptedQty != null && (
                      <div className="text-sm">
                        <span className="text-gray-500">{offeredQtyLabel(item.status)}: </span>
                        <span className="font-semibold">{item.acceptedQty} units</span>
                        {item.status === 'ACCEPTED' && item.acceptedQty === item.requestedQty && (
                          <span className="ml-1 text-xs text-gray-400">(full line)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {item.status === 'PENDING' && (
                    <>
                      <div className="mt-3 flex flex-nowrap items-stretch gap-1">
                        <Button
                          size="sm"
                          className="min-w-0 flex-1 shrink gap-1 px-2 py-1 text-xs leading-tight sm:px-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_.animate-spin]:h-3.5 [&_.animate-spin]:w-3.5"
                          onClick={() => respond.mutate({ itemId: item.id, data: { action: 'ACCEPT' } })}
                          loading={respond.isPending}
                        >
                          <Check className="shrink-0" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="min-w-0 flex-1 shrink gap-1 px-2 py-1 text-xs leading-tight sm:px-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_.animate-spin]:h-3.5 [&_.animate-spin]:w-3.5"
                          onClick={() => respond.mutate({ itemId: item.id, data: { action: 'REJECT' } })}
                          loading={respond.isPending}
                        >
                          <X className="shrink-0" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-w-0 flex-1 shrink gap-1 px-2 py-1 text-xs leading-tight sm:px-2.5 [&_svg]:h-3.5 [&_svg]:w-3.5"
                          onClick={() => {
                            setAlterModal(item);
                            setAlteredQty('');
                            setAlterNote('');
                          }}
                        >
                          <Package className="shrink-0" /> Offer qty
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        <strong>Accept</strong> approves the entire requested amount. Use{' '}
                        <strong>Offer quantity</strong> for what you can supply (less than requested, the full amount, or
                        extra if you have more stock) — the buyer must confirm before the line is final.
                      </p>
                    </>
                  )}

                  {item.vendorNote && (
                    <p className="mt-2 text-xs text-gray-500 italic">Note: {item.vendorNote}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={!!alterModal} onClose={() => setAlterModal(null)} title="Offer quantity">
        {alterModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Buyer requested <strong>{alterModal.requestedQty} units</strong> of {alterModal.product.name}. Enter the
              quantity you can supply (must be at least 1 and not more than requested).
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Quantity you can supply</label>
              <input
                type="number"
                min={1}
                max={alterModal.requestedQty}
                value={alteredQty}
                onChange={(e) => setAlteredQty(e.target.value)}
                placeholder={`1–${alterModal.requestedQty}`}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
              <textarea
                value={alterNote}
                onChange={(e) => setAlterNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <Button
              className="w-full"
              disabled={(() => {
                const n = parseInt(alteredQty, 10);
                return !alteredQty || Number.isNaN(n) || n < 1;
              })()}
              loading={respond.isPending}
              onClick={() =>
                respond.mutate({
                  itemId: alterModal.id,
                  data: { action: 'ALTER', alteredQty: parseInt(alteredQty, 10), note: alterNote || undefined },
                })
              }
            >
              Submit offer
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
