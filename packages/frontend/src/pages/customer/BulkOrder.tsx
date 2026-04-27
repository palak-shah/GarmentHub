import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Minus, Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { orderApi } from '@/api/order.api';
import { useSelectionStore } from '@/store/selectionStore';
import { Header } from '@/components/layout/Header';
import { mediaUrl } from '@/utils/mediaUrl';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Product } from '@/types';
import { apiErrorMessage } from '@/utils/apiError';

type QtyMode = 'same' | 'group' | 'individual';
const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const GROUP_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-green-100 text-green-700 border-green-300',
  'bg-purple-100 text-purple-700 border-purple-300',
  'bg-amber-100 text-amber-700 border-amber-300',
  'bg-pink-100 text-pink-700 border-pink-300',
  'bg-teal-100 text-teal-700 border-teal-300',
  'bg-indigo-100 text-indigo-700 border-indigo-300',
  'bg-rose-100 text-rose-700 border-rose-300',
];

export default function BulkOrder() {
  const { selectedIds, clearSelection, toggleItem, pendingOrderMode, pendingTraderId } = useSelectionStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ids = Array.from(selectedIds);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [globalQty, setGlobalQty] = useState<string>('');
  const [globalQtyTouched, setGlobalQtyTouched] = useState(false);
  const [qtyMode, setQtyMode] = useState<QtyMode>('individual');

  // Group mode state
  const [productGroups, setProductGroups] = useState<Record<string, number>>({}); // productId -> groupIndex
  const [groupQuantities, setGroupQuantities] = useState<Record<number, string>>({}); // groupIndex -> qty string

  /** MANAGED in session without a trader id cannot be fulfilled — match server and place as DIRECT. */
  const orderMode =
    pendingOrderMode === 'MANAGED' && !pendingTraderId ? 'DIRECT' : (pendingOrderMode ?? 'DIRECT');
  const showManagedDowngradeNote = pendingOrderMode === 'MANAGED' && !pendingTraderId;

  const { data: products, isLoading } = useQuery({
    queryKey: ['bulk-order-products', ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      return Promise.all(ids.map((id) => productApi.getById(id)));
    },
    enabled: ids.length > 0,
  });

  useEffect(() => {
    if (ids.length === 0) navigate('/', { replace: true });
  }, [ids.length, navigate]);

  useEffect(() => {
    if (!products) return;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (!(p.id in next)) next[p.id] = p.moq;
      }
      return next;
    });
  }, [products]);

  const maxMoq = useMemo(() => {
    if (!products || products.length === 0) return 0;
    return Math.max(...products.map((p) => p.moq));
  }, [products]);

  /** One product: "same for all" / grouping are meaningless — treat as per-item only. */
  const displayQtyMode: QtyMode =
    products && products.length === 1 ? 'individual' : qtyMode;

  // Active group indices
  const activeGroups = useMemo(() => {
    const s = new Set(Object.values(productGroups));
    return Array.from(s).sort();
  }, [productGroups]);

  // Apply group quantities to individual quantities
  useEffect(() => {
    if (qtyMode !== 'group' || !products || products.length <= 1) return;
    const next: Record<string, number> = { ...quantities };
    for (const p of products) {
      const gi = productGroups[p.id];
      if (gi !== undefined && groupQuantities[gi]) {
        const num = parseInt(groupQuantities[gi], 10);
        if (!isNaN(num) && num > 0) next[p.id] = num;
      }
    }
    setQuantities(next);
  }, [qtyMode, groupQuantities, productGroups, products]);

  const globalNum = parseInt(globalQty, 10);
  const globalQtyValid = !isNaN(globalNum) && globalNum > 0;
  const globalQtyBelowMax = globalQtyValid && globalNum < maxMoq;

  const handleGlobalQtyChange = (val: string) => {
    setGlobalQty(val);
    setGlobalQtyTouched(true);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && products) {
      const next: Record<string, number> = {};
      for (const p of products) next[p.id] = num;
      setQuantities(next);
    }
  };

  const placeOrder = useMutation({
    mutationFn: () => {
      const items = (products ?? [])
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({
          productId: p.id,
          quantity: quantities[p.id] || p.moq,
        }));
      return orderApi.create({
        items,
        orderMode,
        ...(pendingTraderId ? { traderId: pendingTraderId } : {}),
      });
    },
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
      toast.success('Order placed!');
      navigate('/orders', { replace: true });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to place order')),
  });

  const adjustQty = (id: string, delta: number, moq: number) => {
    setGlobalQtyTouched(false);
    setGlobalQty('');
    setQuantities((prev) => {
      const current = prev[id] ?? moq;
      const next = Math.max(moq, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleIndividualQtyChange = (id: string, val: number) => {
    setGlobalQtyTouched(false);
    setGlobalQty('');
    setQuantities((prev) => ({ ...prev, [id]: val }));
  };

  const getQty = (id: string, moq: number) => quantities[id] ?? moq;
  const isBelowMoq = (p: Product) => getQty(p.id, p.moq) < p.moq;
  const hasAnyError = products?.some((p) => isBelowMoq(p)) ?? false;
  const inactiveProducts = useMemo(
    () => (products ?? []).filter((p) => p.status !== 'ACTIVE'),
    [products],
  );
  const hasInactive = inactiveProducts.length > 0;
  const canSubmit = products && products.length > 0 && !hasAnyError && !hasInactive;

  if (isLoading) return <PageSpinner />;

  return (
    <>
      <Header title={`Order (${ids.length})`} showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 pb-32">
        {/* Order mode — read-only, set by trader */}
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-gray-50 px-4 py-3">
          <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {orderMode === 'DIRECT' ? 'Direct order' : 'Trader managed order'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {orderMode === 'DIRECT'
                ? 'You order directly from the vendor. Your trader stays in the loop.'
                : 'Your trader handles this order on your behalf.'}
            </p>
            {showManagedDowngradeNote && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                No trader linked to this basket — placing as a direct order (vendors are notified).
              </p>
            )}
          </div>
        </div>

        {hasInactive && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">Some products cannot be ordered</p>
              <p className="text-xs text-amber-800 mt-1">
                Only active listings can be purchased. Remove unavailable items or contact your trader.
              </p>
              <p className="text-xs text-amber-900/80 mt-2 font-medium break-words">
                {inactiveProducts.map((p) => `${p.name} (${p.status})`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Quantity mode tabs */}
        {products && products.length > 1 && (
          <div className="mb-3 flex rounded-xl bg-gray-100/90 p-1 ring-1 ring-gray-200/80">
            {(['individual', 'same', 'group'] as QtyMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setQtyMode(m)}
                className={`flex-1 rounded-lg py-2.5 text-xs transition-colors ${
                  qtyMode === m
                    ? 'bg-white font-bold text-gray-900 shadow-md ring-1 ring-gray-200/90'
                    : 'font-semibold text-gray-500'
                }`}
              >
                {m === 'individual' ? 'Each item' : m === 'same' ? 'Same for all' : 'By group'}
              </button>
            ))}
          </div>
        )}

        {/* Same qty for all (only when ordering multiple products) */}
        {displayQtyMode === 'same' && (
          <>
            <div className={`mb-2 rounded-lg border p-3 ${
              globalQtyTouched && globalQtyBelowMax
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Same qty for all</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={globalQty}
                  onChange={(e) => handleGlobalQtyChange(e.target.value)}
                  placeholder="Qty"
                  className={`w-20 rounded-lg border bg-white px-3 py-2 text-center text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/25 ${
                    globalQtyTouched && globalQtyBelowMax
                      ? 'border-red-400 text-red-700'
                      : 'border-gray-200'
                  }`}
                />
              </div>
              {globalQtyTouched && globalQtyBelowMax && (
                <div className="mt-2 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-red-600">
                    Minimum quantity must be at least {maxMoq} pcs (highest MOQ among selected products). Please increase to {maxMoq} or more.
                  </p>
                </div>
              )}
            </div>
            {products && products.length > 1 && !globalQtyTouched && (
              <p className="mb-4 text-xs text-gray-400">
                Highest MOQ is {maxMoq} pcs — enter at least {maxMoq} to apply same quantity to all.
              </p>
            )}
          </>
        )}

        {/* Group qty mode */}
        {displayQtyMode === 'group' && products && (
          <div className="mb-4 space-y-3">
            <p className="text-xs text-gray-500">Assign each product to a group, then set quantity per group.</p>

            {/* Group qty inputs */}
            <div className="flex flex-wrap gap-2">
              {activeGroups.map((gi) => {
                const groupMoq = Math.max(
                  ...(products.filter((p) => productGroups[p.id] === gi).map((p) => p.moq)),
                  1,
                );
                return (
                  <div key={gi} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 ${GROUP_COLORS[gi % GROUP_COLORS.length]}`}>
                    <span className="text-xs font-bold">Group {GROUP_LABELS[gi]}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={groupQuantities[gi] || ''}
                      onChange={(e) => setGroupQuantities((prev) => ({ ...prev, [gi]: e.target.value }))}
                      placeholder={`≥${groupMoq}`}
                      className="w-16 rounded border border-current/20 bg-white/50 px-2 py-1 text-center text-sm font-bold focus:outline-none"
                    />
                  </div>
                );
              })}
              {activeGroups.length === 0 && (
                <p className="text-xs text-gray-400 italic">Tap group labels below to assign products</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 mt-4">
          {(products ?? []).map((p) => {
            const qty = getQty(p.id, p.moq);
            const step = p.moq >= 50 ? 50 : p.moq >= 10 ? 10 : 1;
            const error = qty < p.moq;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  error
                    ? 'bg-red-50 border-2 border-red-200'
                    : 'bg-white shadow-sm'
                }`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {p.images?.[0] ? (
                    <img src={mediaUrl(p.images[0])} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300 text-xs">—</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className={`text-xs ${error ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    Min {p.moq} pcs
                    {error && ` — need ${p.moq - qty} more`}
                  </p>

                  {/* Group assignment chips */}
                  {qtyMode === 'group' && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {GROUP_LABELS.slice(0, Math.max(2, activeGroups.length + 1)).map((lbl, gi) => (
                        <button
                          key={gi}
                          onClick={() => setProductGroups((prev) => ({
                            ...prev,
                            [p.id]: prev[p.id] === gi ? -1 : gi,
                          }))}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            productGroups[p.id] === gi
                              ? GROUP_COLORS[gi % GROUP_COLORS.length]
                              : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  )}

                  {displayQtyMode === 'same' && (
                    <p className="mt-2 text-sm font-semibold text-gray-800 tabular-nums">Qty: {qty}</p>
                  )}

                  {displayQtyMode === 'individual' && (
                    <div className="mt-2 flex items-center gap-0">
                      <button
                        onClick={() => adjustQty(p.id, -step, p.moq)}
                        disabled={qty <= p.moq}
                        className="flex h-10 w-10 items-center justify-center rounded-l-xl border border-gray-200 bg-gray-50 text-gray-600 active:bg-gray-100 disabled:opacity-30"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) handleIndividualQtyChange(p.id, val);
                        }}
                        className={`h-10 w-16 border-y text-center text-base font-bold focus:outline-none ${
                          error
                            ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300'
                            : 'border-gray-200'
                        }`}
                      />
                      <button
                        onClick={() => adjustQty(p.id, step, p.moq)}
                        className="flex h-10 w-10 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-600 active:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleItem(p.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 active:bg-red-50 active:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-4xl">
          {hasInactive && (
            <p className="mb-2 text-center text-xs font-semibold text-amber-700">
              Remove unavailable products to place this order
            </p>
          )}
          {hasAnyError && (
            <p className="mb-2 text-center text-xs font-semibold text-red-500">
              Fix quantities below MOQ before placing order
            </p>
          )}
          <button
            onClick={() => placeOrder.mutate()}
            disabled={!canSubmit || placeOrder.isPending}
            className="w-full rounded-xl bg-primary-600 py-4 text-lg font-bold text-white min-h-[56px] active:bg-primary-700 disabled:opacity-50"
          >
            {placeOrder.isPending ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </>
  );
}
