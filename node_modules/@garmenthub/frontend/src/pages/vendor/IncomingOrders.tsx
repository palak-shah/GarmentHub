import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, ArrowUpDown } from 'lucide-react';
import { vendorApi, type VendorResponsePayload } from '@/api/vendor.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemStatusConfig, formatDate, formatPrice } from '@/utils/formatters';
import type { OrderItem } from '@/types';

export default function IncomingOrders() {
  const queryClient = useQueryClient();
  const [alterModal, setAlterModal] = useState<OrderItem | null>(null);
  const [alteredQty, setAlteredQty] = useState('');
  const [alterNote, setAlterNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'PENDING'>('PENDING');

  const { data: items, isLoading } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => vendorApi.getIncomingOrders(),
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

  return (
    <>
      <Header title="Incoming Orders" />
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('PENDING')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === 'PENDING' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            All
          </button>
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState title="No orders" description={filter === 'PENDING' ? 'No pending orders to respond to' : 'No order items yet'} />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const statusCfg = itemStatusConfig[item.status];
              return (
                <div key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.product.images?.[0] ? (
                        <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
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

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Requested: </span>
                      <span className="font-semibold">{item.requestedQty} units</span>
                    </div>
                    {item.product.price && (
                      <span className="text-xs text-gray-500">{formatPrice(item.product.price)}/unit</span>
                    )}
                  </div>

                  {item.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => respond.mutate({ itemId: item.id, data: { action: 'ACCEPT' } })}
                        loading={respond.isPending}
                      >
                        <Check className="h-4 w-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        onClick={() => respond.mutate({ itemId: item.id, data: { action: 'REJECT' } })}
                        loading={respond.isPending}
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setAlterModal(item); setAlteredQty(''); setAlterNote(''); }}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </div>
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

      <Modal open={!!alterModal} onClose={() => setAlterModal(null)} title="Alter Quantity">
        {alterModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Requested: <strong>{alterModal.requestedQty} units</strong> of {alterModal.product.name}
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Your offered quantity</label>
              <input
                type="number"
                value={alteredQty}
                onChange={(e) => setAlteredQty(e.target.value)}
                placeholder="Enter quantity"
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
              disabled={!alteredQty || parseInt(alteredQty) < 1}
              loading={respond.isPending}
              onClick={() =>
                respond.mutate({
                  itemId: alterModal.id,
                  data: { action: 'ALTER', alteredQty: parseInt(alteredQty), note: alterNote || undefined },
                })
              }
            >
              Submit Altered Quantity
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
