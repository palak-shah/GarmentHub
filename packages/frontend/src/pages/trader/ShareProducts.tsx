import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Circle } from 'lucide-react';
import { curationApi } from '@/api/curation.api';
import { productApi } from '@/api/product.api';
import { useSelectionStore } from '@/store/selectionStore';
import { Header } from '@/components/layout/Header';
import { mediaUrl } from '@/utils/mediaUrl';
import { formatPrice } from '@/utils/formatters';
import { PageSpinner } from '@/components/ui/Spinner';
import { apiErrorMessage } from '@/utils/apiError';
import type { TraderCustomer } from '@/api/curation.api';

export default function ShareProducts() {
  const { selectedIds, clearSelection } = useSelectionStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const productIds = Array.from(selectedIds);

  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [orderMode, setOrderMode] = useState<'DIRECT' | 'MANAGED'>('DIRECT');
  /** Optional favored unit price per product (blank = customer sees list price). */
  const [offers, setOffers] = useState<Record<string, string>>({});

  const { data: customers, isLoading } = useQuery({
    queryKey: ['trader-customers'],
    queryFn: () => curationApi.getCustomers(),
  });

  const { data: previewProducts, isLoading: previewLoading } = useQuery({
    queryKey: ['share-preview', [...productIds].sort().join(',')],
    queryFn: () => Promise.all(productIds.map((id) => productApi.getById(id))),
    enabled: productIds.length > 0,
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      curationApi.createShare({
        products: productIds.map((id) => {
          const raw = offers[id]?.trim() ?? '';
          if (!raw) return { productId: id };
          const n = parseFloat(raw);
          return { productId: id, traderOfferUnitPrice: n };
        }),
        customerIds: Array.from(selectedCustomers),
        note: note || undefined,
        orderMode,
      }),
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['curation-sent'] });
      toast.success('Shared!');
      navigate('/', { replace: true });
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Failed to share')),
  });

  const submitShare = () => {
    for (const id of productIds) {
      const raw = offers[id]?.trim() ?? '';
      if (!raw) continue;
      const n = parseFloat(raw);
      if (Number.isNaN(n) || n <= 0) {
        toast.error('Enter a positive price per line, or leave blank to use the list price');
        return;
      }
    }
    shareMutation.mutate();
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCustomers = () => {
    if (!customers) return;
    const allIds = customers.map((c) => c.id);
    const allSelected = allIds.every((id) => selectedCustomers.has(id));
    if (allSelected) setSelectedCustomers(new Set());
    else setSelectedCustomers(new Set(allIds));
  };

  if (isLoading || previewLoading || !previewProducts) return <PageSpinner />;

  if (productIds.length === 0) {
    return (
      <>
        <Header title="Share" showBack />
        <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-gray-600">
          Select products first, then open Share again.
        </div>
      </>
    );
  }

  const allCustomerIds = customers?.map((c) => c.id) ?? [];
  const allSelected = allCustomerIds.length > 0 && allCustomerIds.every((id) => selectedCustomers.has(id));

  return (
    <>
      <Header title={`Share ${productIds.length} items`} showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 pb-32 space-y-5">
        {/* Customers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-900">Send to</p>
            {allCustomerIds.length > 1 && (
              <button
                onClick={selectAllCustomers}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium active:bg-gray-100 min-h-[36px]"
              >
                {allSelected ? <CheckCircle2 className="h-4 w-4 text-primary-600" /> : <Circle className="h-4 w-4 text-gray-300" />}
                All
              </button>
            )}
          </div>

          {(!customers || customers.length === 0) ? (
            <p className="text-sm text-gray-400 py-4 text-center">No customers following you yet</p>
          ) : (
            <div className="space-y-1">
              {customers.map((c: TraderCustomer) => (
                <button
                  key={c.id}
                  onClick={() => toggleCustomer(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 min-h-[56px] text-left ${
                    selectedCustomers.has(c.id) ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                    {(c.businessName || c.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{c.businessName || c.name}</p>
                  </div>
                  {selectedCustomers.has(c.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Favored prices for the customer */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-1">Your offer to the customer (optional)</p>
          <p className="text-xs text-gray-500 mb-3">
            Set a better unit price per item if you want — it appears on their feed and is applied when they check out.
            Leave blank to use the vendor list price.
          </p>
          <div className="space-y-3">
            {previewProducts.map((p) => (
              <div
                key={p.id}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 items-start"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {p.images?.[0] ? (
                    <img src={mediaUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">List: {formatPrice(p.price, p.priceMax)} / unit</p>
                  <label className="block text-[11px] font-semibold text-primary-800">Favored price / unit</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    placeholder="Optional"
                    value={offers[p.id] ?? ''}
                    onChange={(e) => setOffers((o) => ({ ...o, [p.id]: e.target.value }))}
                    className="w-full rounded-lg border-2 border-primary-100 bg-primary-50/50 px-3 py-2 text-sm font-medium"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Add a note (optional)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Good quality, check this lot"
            rows={2}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base min-h-[56px] focus:border-primary-500 focus:outline-none resize-none"
          />
        </div>

        {/* Order mode */}
        <div>
          <p className="text-sm font-bold text-gray-900 mb-2">Order workflow</p>
          <div className="flex gap-2">
            {(['DIRECT', 'MANAGED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setOrderMode(mode)}
                className={`flex-1 rounded-xl border-2 py-3 px-2 text-center min-h-[48px] ${
                  orderMode === mode
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200'
                }`}
              >
                <p className={`text-sm font-semibold ${orderMode === mode ? 'text-primary-700' : 'text-gray-500'}`}>
                  {mode === 'DIRECT' ? 'Direct' : 'Managed'}
                </p>
                <p className={`text-[10px] mt-0.5 ${orderMode === mode ? 'text-primary-500' : 'text-gray-400'}`}>
                  {mode === 'DIRECT' ? 'Customer → Vendor (you observe)' : 'Customer → You → Vendor'}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            You are always in the loop regardless of the mode.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={submitShare}
            disabled={selectedCustomers.size === 0 || shareMutation.isPending}
            className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white min-h-[56px] active:bg-primary-700 disabled:opacity-50"
          >
            {shareMutation.isPending ? 'Sharing...' : `Share to ${selectedCustomers.size} customers`}
          </button>
        </div>
      </div>
    </>
  );
}
