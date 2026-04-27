import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, X, Package, Send } from 'lucide-react';
import { vendorApi, type VendorResponsePayload } from '@/api/vendor.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemStatusConfig, formatPrice } from '@/utils/formatters';
import { formatRelativeOrderAge, getCustomerNeedByUrgency } from '@/lib/orderWorkflow';
import { mediaUrl } from '@/utils/mediaUrl';
import { useAuthStore } from '@/store/authStore';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import type { OrderItem } from '@/types';

type OrderFilter = 'all' | 'PENDING' | 'ALTERED' | 'ACCEPTED' | 'REJECTED' | 'CONFIRMED';

function offeredQtyLabel(status: OrderItem['status']): string {
  if (status === 'CONFIRMED') return 'Confirmed quantity';
  if (status === 'ALTERED') return 'Offered quantity';
  return 'Accepted quantity';
}

export default function IncomingOrders() {
  useScrollRestore('vendor-orders');
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<OrderFilter>('PENDING');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [offerDrafts, setOfferDrafts] = useState<Record<string, { qty: string; price: string; note: string }>>({});
  const [expandedOffer, setExpandedOffer] = useState<Set<string>>(new Set());

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
      toast.success('Saved');
      setSelected(new Set());
    },
    onError: () => toast.error('Failed to respond'),
  });

  const bulkMut = useMutation({
    mutationFn: (responses: Parameters<typeof vendorApi.bulkRespond>[0]) => vendorApi.bulkRespond(responses),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast.success(`${data.updated} line(s) updated`);
      setSelected(new Set());
      setOfferDrafts({});
      setExpandedOffer(new Set());
    },
    onError: () => toast.error('Bulk update failed'),
  });

  const priceCounterRespond = useMutation({
    mutationFn: ({ itemId, action }: { itemId: string; action: 'ACCEPT' | 'REJECT' }) =>
      vendorApi.respondToTraderPrice(itemId, { action }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast.success(v.action === 'ACCEPT' ? 'Trader price accepted' : 'Trader price declined');
    },
    onError: () => toast.error('Failed to update price'),
  });

  const filtered = items?.filter((i) => filter === 'all' || i.status === filter) || [];

  const orderGroups = useMemo(() => {
    const m = new Map<string, OrderItem[]>();
    for (const it of filtered) {
      if (!m.has(it.orderId)) m.set(it.orderId, []);
      m.get(it.orderId)!.push(it);
    }
    return [...m.entries()].sort((a, b) => {
      const da = new Date(a[1][0]?.order?.createdAt ?? 0).getTime();
      const db = new Date(b[1][0]?.order?.createdAt ?? 0).getTime();
      return db - da;
    });
  }, [filtered]);

  const toggleSelect = useCallback((itemId: string, line: OrderItem) => {
    if (line.status !== 'PENDING') return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAllPendingInOrder = useCallback((lines: OrderItem[]) => {
    const pending = lines.filter((l) => l.status === 'PENDING').map((l) => l.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSel = pending.every((id) => next.has(id));
      if (allSel) pending.forEach((id) => next.delete(id));
      else pending.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const bulkAccept = () => {
    const responses = filtered.filter((i) => selected.has(i.id) && i.status === 'PENDING').map((i) => ({ itemId: i.id, action: 'ACCEPT' as const }));
    if (!responses.length) {
      toast.error('Select pending lines to accept');
      return;
    }
    bulkMut.mutate(responses);
  };

  const bulkReject = () => {
    const responses = filtered.filter((i) => selected.has(i.id) && i.status === 'PENDING').map((i) => ({ itemId: i.id, action: 'REJECT' as const }));
    if (!responses.length) {
      toast.error('Select pending lines to reject');
      return;
    }
    bulkMut.mutate(responses);
  };

  const submitOfferDrafts = () => {
    const responses: Parameters<typeof vendorApi.bulkRespond>[0] = [];
    for (const [itemId, d] of Object.entries(offerDrafts)) {
      const line = filtered.find((i) => i.id === itemId);
      if (!line || line.status !== 'PENDING') continue;
      const q = parseInt(d.qty, 10);
      if (Number.isNaN(q) || q < 1) continue;
      const op = d.price.trim() ? parseFloat(d.price) : undefined;
      responses.push({
        itemId,
        action: 'ALTER',
        alteredQty: q,
        note: d.note.trim() || undefined,
        ...(op != null && !Number.isNaN(op) && op > 0 ? { offeredUnitPrice: op } : {}),
      });
    }
    if (!responses.length) {
      toast.error('Add at least one valid offer quantity');
      return;
    }
    bulkMut.mutate(responses);
  };

  const emptyDescription: Record<OrderFilter, string> = {
    all: 'No order items yet',
    PENDING: 'No pending orders to respond to',
    ALTERED: 'No lines awaiting buyer confirmation',
    ACCEPTED: 'No accepted order lines',
    REJECTED: 'No rejected order lines',
    CONFIRMED: 'No confirmed order lines (buyer confirmed an offered quantity)',
  };

  const filterChips: { key: OrderFilter; label: string }[] = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'ALTERED', label: 'Offered qty' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'all', label: 'All' },
  ];

  const pendingSelected = filtered.filter((i) => selected.has(i.id) && i.status === 'PENDING').length;
  const offerQueueCount = Object.entries(offerDrafts).filter(([id, d]) => {
    const line = filtered.find((i) => i.id === id);
    const q = parseInt(d.qty, 10);
    return line?.status === 'PENDING' && !Number.isNaN(q) && q >= 1;
  }).length;

  return (
    <>
      <Header title="Orders" />
      <div className="mx-auto max-w-4xl pb-40">
        <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide border-b border-gray-100">
          {filterChips.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                filter === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selected.size > 0 && filter === 'PENDING' && (
          <div className="sticky top-0 z-20 flex flex-wrap gap-2 border-b border-gray-100 bg-white px-4 py-2">
            <Button size="sm" className="min-h-[44px] flex-1 sm:flex-none" onClick={bulkAccept} loading={bulkMut.isPending}>
              <Check className="h-4 w-4 mr-1" /> Accept ({pendingSelected})
            </Button>
            <Button size="sm" variant="danger" className="min-h-[44px] flex-1 sm:flex-none" onClick={bulkReject} loading={bulkMut.isPending}>
              <X className="h-4 w-4 mr-1" /> Reject ({pendingSelected})
            </Button>
          </div>
        )}

        <div className="px-4 pt-4">
          {(!userId || isLoading) && !items ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : orderGroups.length === 0 ? (
            <EmptyState title="No orders" description={emptyDescription[filter]} />
          ) : (
            <div className="space-y-6">
              {orderGroups.map(([orderId, lines]) => {
                const meta = lines[0]?.order;
                const created = meta?.createdAt ?? lines[0]?.createdAt ?? '';
                const totalReq = lines.reduce((s, l) => s + l.requestedQty, 0);
                const pendingN = lines.filter((l) => l.status === 'PENDING').length;
                const acceptedN = lines.filter((l) => l.status === 'ACCEPTED' || l.status === 'CONFIRMED').length;
                const alteredN = lines.filter((l) => l.status === 'ALTERED').length;
                const needByUrgency = getCustomerNeedByUrgency(meta?.customerNeedBy);

                return (
                  <section key={orderId} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900">Order #{orderId.slice(-6).toUpperCase()}</p>
                        {needByUrgency === 'overdue' && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-900">
                            Overdue
                          </span>
                        )}
                        {needByUrgency === 'urgent' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Customer:</span>{' '}
                        {meta?.customer.businessName || meta?.customer.name || '—'}
                      </p>
                      {meta?.trader && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Trader:</span>{' '}
                          {meta.trader.businessName || meta.trader.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {lines.length} items · {totalReq} units requested · {formatRelativeOrderAge(created)}
                      </p>
                      {filter === 'PENDING' && pendingN > 0 && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary-600"
                          onClick={() => selectAllPendingInOrder(lines)}
                        >
                          Select all pending in this order
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-gray-100">
                      {lines.map((item) => {
                        const statusCfg = itemStatusConfig[item.status];
                        const checked = selected.has(item.id);
                        const showOffer = expandedOffer.has(item.id);
                        const draft = offerDrafts[item.id] ?? { qty: '', price: '', note: '' };

                        return (
                          <div key={item.id} className="p-4">
                            <div className="flex gap-3">
                              {item.status === 'PENDING' && filter === 'PENDING' && (
                                <input
                                  type="checkbox"
                                  className="mt-4 h-5 w-5 shrink-0 rounded border-gray-300"
                                  checked={checked}
                                  onChange={() => toggleSelect(item.id, item)}
                                  aria-label="Select line"
                                />
                              )}
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                {item.product.images?.[0] ? (
                                  <img src={mediaUrl(item.product.images[0])} alt="" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
                                <p className="text-xs text-gray-500">Requested: {item.requestedQty} units</p>
                                {item.product.price != null && (
                                  <p className="text-xs text-gray-400">
                                    List: {formatPrice(item.product.price, item.product.priceMax)}/unit
                                  </p>
                                )}
                                {item.traderTargetUnitPrice != null && (
                                  <p className="text-xs font-semibold text-primary-900 mt-0.5">
                                    Trader committed to customer:{' '}
                                    {formatPrice(item.traderTargetUnitPrice)}/unit
                                  </p>
                                )}
                              </div>
                              <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                            </div>

                            {item.acceptedQty != null && (
                              <p className="mt-2 text-sm text-gray-700">
                                <span className="text-gray-500">{offeredQtyLabel(item.status)}: </span>
                                <span className="font-semibold">{item.acceptedQty} units</span>
                              </p>
                            )}

                            {item.status === 'ALTERED' && item.traderCounterUnitPrice != null && (
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1 min-h-[40px]"
                                  loading={priceCounterRespond.isPending}
                                  onClick={() => priceCounterRespond.mutate({ itemId: item.id, action: 'ACCEPT' })}
                                >
                                  Accept trader price
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 min-h-[40px]"
                                  loading={priceCounterRespond.isPending}
                                  onClick={() => priceCounterRespond.mutate({ itemId: item.id, action: 'REJECT' })}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}

                            {item.status === 'PENDING' && (
                              <div className="mt-3 space-y-2">
                                {!showOffer ? (
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      className="min-h-[40px]"
                                      onClick={() => respond.mutate({ itemId: item.id, data: { action: 'ACCEPT' } })}
                                      loading={respond.isPending}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" /> Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      className="min-h-[40px]"
                                      onClick={() => respond.mutate({ itemId: item.id, data: { action: 'REJECT' } })}
                                      loading={respond.isPending}
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="min-h-[40px]"
                                      onClick={() => {
                                        setExpandedOffer((s) => {
                                          const n = new Set(s);
                                          n.add(item.id);
                                          return n;
                                        });
                                        setOfferDrafts((d) => ({
                                          ...d,
                                          [item.id]: d[item.id] ?? { qty: '', price: '', note: '' },
                                        }));
                                      }}
                                    >
                                      <Package className="h-3.5 w-3.5 mr-1" /> Offer qty
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                    {item.traderTargetUnitPrice != null && (
                                      <p className="text-[11px] font-medium text-primary-900 bg-primary-50/80 rounded-md px-2 py-1.5 border border-primary-100">
                                        Trader committed to customer:{' '}
                                        {formatPrice(item.traderTargetUnitPrice)}/unit — use your offer below if
                                        different.
                                      </p>
                                    )}
                                    <p className="text-xs font-medium text-gray-700">Offer quantity (not requested)</p>
                                    <div className="flex gap-2 items-end flex-wrap">
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="text-[10px] text-gray-500">Offer</label>
                                        <input
                                          type="number"
                                          min={1}
                                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                                          value={draft.qty}
                                          onChange={(e) =>
                                            setOfferDrafts((d) => ({
                                              ...d,
                                              [item.id]: { ...draft, qty: e.target.value },
                                            }))
                                          }
                                          placeholder="Qty"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="text-[10px] text-gray-500">₹/unit (opt.)</label>
                                        <input
                                          type="number"
                                          min={0.01}
                                          step="0.01"
                                          className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                                          value={draft.price}
                                          onChange={(e) =>
                                            setOfferDrafts((d) => ({
                                              ...d,
                                              [item.id]: { ...draft, price: e.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>
                                    <input
                                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs"
                                      placeholder="Note (optional)"
                                      value={draft.note}
                                      onChange={(e) =>
                                        setOfferDrafts((d) => ({
                                          ...d,
                                          [item.id]: { ...draft, note: e.target.value },
                                        }))
                                      }
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="flex-1"
                                        loading={bulkMut.isPending}
                                        disabled={(() => {
                                          const q = parseInt(draft.qty, 10);
                                          return Number.isNaN(q) || q < 1;
                                        })()}
                                        onClick={() => {
                                          const q = parseInt(draft.qty, 10);
                                          const op = draft.price.trim() ? parseFloat(draft.price) : undefined;
                                          bulkMut.mutate([
                                            {
                                              itemId: item.id,
                                              action: 'ALTER',
                                              alteredQty: q,
                                              note: draft.note.trim() || undefined,
                                              ...(op != null && !Number.isNaN(op) && op > 0 ? { offeredUnitPrice: op } : {}),
                                            },
                                          ]);
                                        }}
                                      >
                                        Save offer
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                          setExpandedOffer((s) => {
                                            const n = new Set(s);
                                            n.delete(item.id);
                                            return n;
                                          });
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {item.vendorNote && (
                              <p className="mt-2 text-xs text-gray-500 italic">Note: {item.vendorNote}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-700 space-y-1">
                      <p>
                        <span className="font-semibold">Response summary:</span> {acceptedN} accepted · {alteredN} modified ·{' '}
                        {pendingN} pending
                      </p>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {offerQueueCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
          <Button className="w-full min-h-[52px] text-base font-semibold" onClick={submitOfferDrafts} loading={bulkMut.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Submit {offerQueueCount} offer{offerQueueCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </>
  );
}
