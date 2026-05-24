import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

type PackRow = {
  lineKey: string;
  product: Product;
  productImageId?: string;
  defaultQty: number;
};

function rowThumbUrl(row: PackRow): string | undefined {
  if (row.productImageId && row.product.imageAssets?.length) {
    const asset = row.product.imageAssets.find((a) => a.id === row.productImageId);
    if (asset) return asset.url;
  }
  return row.product.images?.[0];
}

export default function BulkOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderDraft = (
    location.state as {
      orderDraft?: {
        traderId?: string;
        orderMode?: 'DIRECT' | 'MANAGED';
        lines: { productId: string; productImageId?: string; quantity?: number }[];
      };
    } | null
  )?.orderDraft;

  const { selectedIds, clearSelection, toggleItem, pendingOrderMode, pendingTraderId } = useSelectionStore();
  const queryClient = useQueryClient();
  const selectionIdsList = Array.from(selectedIds);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [draftHiddenKeys, setDraftHiddenKeys] = useState<Set<string>>(() => new Set());
  const [globalQty, setGlobalQty] = useState<string>('');
  const [globalQtyTouched, setGlobalQtyTouched] = useState(false);
  const [qtyMode, setQtyMode] = useState<QtyMode>('individual');

  const [productGroups, setProductGroups] = useState<Record<string, number>>({});
  const [groupQuantities, setGroupQuantities] = useState<Record<number, string>>({});

  const hasInbound = Boolean(orderDraft?.lines?.length) || selectionIdsList.length > 0;

  const { data: packed, isLoading } = useQuery({
    queryKey: [
      'bulk-order-pack',
      orderDraft?.traderId,
      orderDraft?.orderMode,
      JSON.stringify(orderDraft?.lines ?? []),
      selectionIdsList.slice().sort().join(','),
    ],
    queryFn: async () => {
      if (orderDraft?.lines?.length) {
        const uids = [...new Set(orderDraft.lines.map((l) => l.productId))];
        const plist = await Promise.all(uids.map((id) => productApi.getById(id)));
        const pmap = new Map(plist.map((p) => [p.id, p]));
        const rows = orderDraft.lines.map((line, idx) => {
          const prod = pmap.get(line.productId);
          if (!prod) throw new Error('Product not found');
          const lineKey = `${line.productId}_${line.productImageId ?? idx}`;
          return {
            lineKey,
            product: prod,
            productImageId: line.productImageId,
            defaultQty: line.quantity ?? prod.moq,
          } satisfies PackRow;
        });
        return {
          rows,
          source: 'draft' as const,
          traderId: orderDraft.traderId ?? null,
          draftOrderMode: orderDraft.orderMode ?? ('DIRECT' as const),
        };
      }
      if (!selectionIdsList.length) {
        return {
          rows: [] as PackRow[],
          source: 'pick' as const,
          traderId: pendingTraderId,
          draftOrderMode: undefined as 'DIRECT' | 'MANAGED' | undefined,
        };
      }
      const plist = await Promise.all(selectionIdsList.map((id) => productApi.getById(id)));
      return {
        rows: plist.map(
          (p): PackRow => ({
            lineKey: p.id,
            product: p,
            defaultQty: p.moq,
          }),
        ),
        source: 'pick' as const,
        traderId: pendingTraderId,
        draftOrderMode: undefined as 'DIRECT' | 'MANAGED' | undefined,
      };
    },
    enabled: hasInbound,
  });

  useEffect(() => {
    if (!hasInbound) navigate('/', { replace: true });
  }, [hasInbound, navigate]);

  const rows = packed?.rows ?? [];
  const isDraftPack = packed?.source === 'draft';

  const activeRows = useMemo(() => {
    if (!rows.length) return [];
    if (isDraftPack) return rows.filter((r) => !draftHiddenKeys.has(r.lineKey));
    return rows;
  }, [rows, isDraftPack, draftHiddenKeys]);

  useEffect(() => {
    if (packed?.source !== 'draft' || rows.length === 0) return;
    if (activeRows.length === 0) navigate('/', { replace: true });
  }, [packed?.source, rows.length, activeRows.length, navigate]);

  const effectiveTraderId =
    packed?.source === 'draft' ? packed?.traderId ?? null : pendingTraderId ?? null;
  const attemptedMode =
    packed?.source === 'draft' ? packed?.draftOrderMode ?? 'DIRECT' : pendingOrderMode ?? 'DIRECT';

  const orderMode =
    attemptedMode === 'MANAGED' && !effectiveTraderId ? 'DIRECT' : attemptedMode;
  const showManagedDowngradeNote =
    attemptedMode === 'MANAGED' && !effectiveTraderId && packed?.source !== 'draft';

  useEffect(() => {
    if (!rows.length) return;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (!(r.lineKey in next)) next[r.lineKey] = r.defaultQty;
      }
      return next;
    });
  }, [rows]);

  const maxMoq = useMemo(() => {
    if (activeRows.length === 0) return 0;
    return Math.max(...activeRows.map((r) => r.product.moq));
  }, [activeRows]);

  const displayQtyMode: QtyMode =
    activeRows.length <= 1 ? 'individual' : qtyMode;

  const activeGroups = useMemo(() => {
    const s = new Set(Object.values(productGroups));
    return Array.from(s).sort();
  }, [productGroups]);

  useEffect(() => {
    if (qtyMode !== 'group' || activeRows.length <= 1) return;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const r of activeRows) {
        const gi = productGroups[r.lineKey];
        if (gi !== undefined && groupQuantities[gi]) {
          const num = parseInt(groupQuantities[gi], 10);
          if (!isNaN(num) && num > 0) next[r.lineKey] = num;
        }
      }
      return next;
    });
  }, [qtyMode, groupQuantities, productGroups, activeRows]);

  const globalNum = parseInt(globalQty, 10);
  const globalQtyValid = !isNaN(globalNum) && globalNum > 0;
  const globalQtyBelowMax = globalQtyValid && globalNum < maxMoq;

  const handleGlobalQtyChange = (val: string) => {
    setGlobalQty(val);
    setGlobalQtyTouched(true);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && activeRows.length) {
      const next: Record<string, number> = { ...quantities };
      for (const r of activeRows) next[r.lineKey] = num;
      setQuantities(next);
    }
  };

  const placeOrder = useMutation({
    mutationFn: () => {
      const items = activeRows.map((r) => ({
        productId: r.product.id,
        quantity: quantities[r.lineKey] ?? r.defaultQty,
        ...(r.productImageId ? { productImageId: r.productImageId } : {}),
      }));
      return orderApi.create({
        items,
        orderMode,
        ...(effectiveTraderId ? { traderId: effectiveTraderId } : {}),
      });
    },
    onSuccess: () => {
      if (packed?.source !== 'draft') clearSelection();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
      toast.success('Order placed!');
      navigate('/orders', { replace: true });
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to place order')),
  });

  const adjustQty = (lineKey: string, delta: number, moq: number) => {
    setGlobalQtyTouched(false);
    setGlobalQty('');
    setQuantities((prev) => {
      const current = prev[lineKey] ?? moq;
      const next = Math.max(moq, current + delta);
      return { ...prev, [lineKey]: next };
    });
  };

  const handleIndividualQtyChange = (lineKey: string, val: number) => {
    setGlobalQtyTouched(false);
    setGlobalQty('');
    setQuantities((prev) => ({ ...prev, [lineKey]: val }));
  };

  const getQty = (lineKey: string, moq: number) => quantities[lineKey] ?? moq;
  const isBelowMoq = (row: PackRow) => getQty(row.lineKey, row.product.moq) < row.product.moq;

  const hasAnyError = activeRows.some(isBelowMoq);
  const inactiveProducts = activeRows.filter((r) => r.product.status !== 'ACTIVE').map((r) => r.product);
  const hasInactive = inactiveProducts.length > 0;
  const canSubmit = activeRows.length > 0 && !hasAnyError && !hasInactive;

  const lineCount = activeRows.length;

  if (isLoading) return <PageSpinner />;

  return (
    <>
      <Header title={`Order (${lineCount})`} showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 pb-32">
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

        {activeRows.length > 1 && (
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

        {displayQtyMode === 'same' && (
          <>
            <div className={`mb-2 rounded-lg border p-3 ${
              globalQtyTouched && globalQtyBelowMax
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
            >
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
                    Minimum quantity must be at least {maxMoq} pcs (highest MOQ among selected products).
                    Please increase to {maxMoq} or more.
                  </p>
                </div>
              )}
            </div>
            {activeRows.length > 1 && !globalQtyTouched && (
              <p className="mb-4 text-xs text-gray-400">
                Highest MOQ is {maxMoq} pcs — enter at least {maxMoq} to apply same quantity to all.
              </p>
            )}
          </>
        )}

        {displayQtyMode === 'group' && activeRows.length > 0 && (
          <div className="mb-4 space-y-3">
            <p className="text-xs text-gray-500">Assign each line to a group, then set quantity per group.</p>

            <div className="flex flex-wrap gap-2">
              {activeGroups.map((gi) => {
                const groupMoq = Math.max(
                  ...activeRows.filter((r) => productGroups[r.lineKey] === gi).map((r) => r.product.moq),
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
                <p className="text-xs text-gray-400 italic">Tap group labels below to assign items</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 mt-4">
          {activeRows.map((r) => {
            const p = r.product;
            const qty = getQty(r.lineKey, p.moq);
            const step = p.moq >= 50 ? 50 : p.moq >= 10 ? 10 : 1;
            const error = qty < p.moq;
            const thumb = rowThumbUrl(r);
            return (
              <div
                key={r.lineKey}
                className={`flex items-center gap-3 rounded-2xl p-3 ${
                  error ? 'bg-red-50 border-2 border-red-200' : 'bg-white shadow-sm'
                }`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {thumb ? (
                    <img src={mediaUrl(thumb)} alt="" className="h-full w-full object-cover" loading="lazy" />
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

                  {qtyMode === 'group' && activeRows.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {GROUP_LABELS.slice(0, Math.max(2, activeGroups.length + 1)).map((_lbl, gi) => (
                        <button
                          key={gi}
                          onClick={() =>
                            setProductGroups((prev) => ({
                              ...prev,
                              [r.lineKey]: prev[r.lineKey] === gi ? -1 : gi,
                            }))
                          }
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            productGroups[r.lineKey] === gi
                              ? GROUP_COLORS[gi % GROUP_COLORS.length]
                              : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}
                        >
                          {_lbl}
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
                        onClick={() => adjustQty(r.lineKey, -step, p.moq)}
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
                          if (!isNaN(val)) handleIndividualQtyChange(r.lineKey, val);
                        }}
                        className={`h-10 w-16 border-y text-center text-base font-bold focus:outline-none ${
                          error
                            ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-300'
                            : 'border-gray-200'
                        }`}
                      />
                      <button
                        onClick={() => adjustQty(r.lineKey, step, p.moq)}
                        className="flex h-10 w-10 items-center justify-center rounded-r-xl border border-gray-200 bg-gray-50 text-gray-600 active:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (isDraftPack)
                      setDraftHiddenKeys((prev) => new Set(prev).add(r.lineKey));
                    else toggleItem(p.id);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 active:bg-red-50 active:text-red-500"
                  aria-label="Remove line"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

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
