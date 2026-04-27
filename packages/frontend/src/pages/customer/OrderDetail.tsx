import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Shield, RefreshCw } from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/store/authStore';
import { useSelectionStore } from '@/store/selectionStore';
import { Header } from '@/components/layout/Header';
import { VendorResponseCard } from '@/components/order/VendorResponseCard';
import { OrderSummary } from '@/components/order/OrderSummary';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDateTime } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import { computeOrderTotals, getCustomerOrderDecisionLabel, getTraderOrderStage } from '@/lib/orderWorkflow';
import { apiErrorMessage } from '@/utils/apiError';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isTrader = user?.role === 'TRADER';
  const isCustomer = user?.role === 'CUSTOMER';
  const { selectAll } = useSelectionStore();
  const [modifyMode, setModifyMode] = useState(false);
  const [modifyQty, setModifyQty] = useState<Record<string, string>>({});
  const [traderDraft, setTraderDraft] = useState<{
    note: string;
    qty: Record<string, string>;
    unitPrice: Record<string, string>;
  }>({
    note: '',
    qty: {},
    unitPrice: {},
  });

  const { data: order, isPending, isError, error: loadError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(id!),
    enabled: !!id,
  });

  const confirmOrderMut = useMutation({
    mutationFn: () => orderApi.confirm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order accepted');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not accept order')),
  });

  const cancelMut = useMutation({
    mutationFn: () => orderApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
      navigate('/orders');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not cancel')),
  });

  const modifyMut = useMutation({
    mutationFn: (items: { itemId: string; requestedQty: number }[]) => orderApi.modifyItems(id!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated — vendors notified');
      setModifyMode(false);
      setModifyQty({});
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not save changes')),
  });

  const takeControl = useMutation({
    mutationFn: () => orderApi.takeControl(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('You are now managing this order');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Failed to take control')),
  });

  const releaseMut = useMutation({
    mutationFn: () => orderApi.releaseToVendors(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['trader-alerts'] });
      toast.success('Order sent to vendors');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not release to vendors')),
  });

  const traderAdjustMut = useMutation({
    mutationFn: (body: {
      items?: { itemId: string; requestedQty?: number; unitPrice?: number | null }[];
      note?: string | null;
    }) => orderApi.traderAdjust(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['trader-alerts'] });
      toast.success('Order updated');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not save changes')),
  });

  const decision = useMemo(
    () => (order ? getCustomerOrderDecisionLabel(order, order.items) : null),
    [order],
  );

  const traderStage = useMemo(
    () => (order && isTrader ? getTraderOrderStage(order, order.items) : null),
    [order, isTrader],
  );

  const orderItemsSig =
    order?.items
      .map(
        (i) =>
          `${i.id}:${i.requestedQty}:${i.traderTargetUnitPrice ?? ''}:${i.product.price ?? ''}`,
      )
      .join('|') ?? '';

  useEffect(() => {
    if (!order || !isTrader) return;
    const qty: Record<string, string> = {};
    const unitPrice: Record<string, string> = {};
    for (const it of order.items) {
      qty[it.id] = String(it.requestedQty);
      const display = it.traderTargetUnitPrice ?? it.product.price;
      unitPrice[it.id] = display != null ? String(display) : '';
    }
    setTraderDraft({ note: order.note ?? '', qty, unitPrice });
  }, [isTrader, order?.id, order?.note, orderItemsSig]);

  const isAssignedTraderOnOrder =
    !!order &&
    !!user?.id &&
    order.traderId != null &&
    String(order.traderId) === String(user.id);

  const traderCanAdjust =
    isTrader &&
    order &&
    isAssignedTraderOnOrder &&
    !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(order.status) &&
    ((order.orderMode === 'MANAGED' && !order.releasedToVendorsAt) ||
      (order.items.length > 0 && order.items.every((i) => i.status === 'PENDING')));

  const traderOfferUnitPriceEditable =
    !!order &&
    ((order.orderMode === 'MANAGED' && !order.releasedToVendorsAt) ||
      (order.items.length > 0 && order.items.every((i) => i.status === 'PENDING')));

  const submitTraderAdjust = () => {
    if (!order) return;
    const priceUnequal = (a: number | null | undefined, b: number | null | undefined) => {
      const na = a == null ? null : a;
      const nb = b == null ? null : b;
      if (na === null && nb === null) return false;
      if (na === null || nb === null) return true;
      return Math.abs(na - nb) > 1e-9;
    };

    const items: { itemId: string; requestedQty?: number; unitPrice?: number | null }[] = [];
    for (const it of order.items) {
      const raw = traderDraft.qty[it.id];
      const n = parseInt(raw ?? '', 10);
      if (Number.isNaN(n) || n < 1) {
        toast.error('Each line needs a valid quantity (min 1)');
        return;
      }
      const qtyChanged = n !== it.requestedQty;

      let unitPriceOut: number | null | undefined;
      if (traderOfferUnitPriceEditable) {
        const rawP = traderDraft.unitPrice[it.id]?.trim() ?? '';
        let desired: number | null;
        if (rawP === '') {
          desired = null;
        } else {
          const p = parseFloat(rawP);
          if (Number.isNaN(p) || p <= 0) {
            toast.error(
              'Each line needs a valid favored unit price (a positive number), or leave it blank to use the list price.',
            );
            return;
          }
          const list = it.product.price;
          desired = list != null && Math.abs(p - list) < 1e-9 ? null : p;
        }
        if (priceUnequal(it.traderTargetUnitPrice, desired)) {
          unitPriceOut = desired;
        }
      }

      if (qtyChanged || unitPriceOut !== undefined) {
        const row: { itemId: string; requestedQty?: number; unitPrice?: number | null } = {
          itemId: it.id,
        };
        if (qtyChanged) row.requestedQty = n;
        if (unitPriceOut !== undefined) row.unitPrice = unitPriceOut;
        items.push(row);
      }
    }
    const noteNorm = traderDraft.note.trim();
    const serverNote = (order.note ?? '').trim();
    const noteChanged = noteNorm !== serverNote;
    if (items.length === 0 && !noteChanged) {
      toast.error('No changes');
      return;
    }
    traderAdjustMut.mutate({
      ...(items.length ? { items } : {}),
      ...(noteChanged ? { note: noteNorm === '' ? null : noteNorm } : {}),
    });
  };

  const totals = useMemo(() => (order ? computeOrderTotals(order.items) : null), [order]);

  const canModify =
    isCustomer &&
    order &&
    !['CONFIRMED', 'CANCELLED'].includes(order.status) &&
    !modifyMode;

  const showCustomerFooter =
    isCustomer &&
    order &&
    !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(order.status) &&
    !modifyMode;

  const anyPending = order?.items.some((i) => i.status === 'PENDING') ?? false;
  const anyAltered = order?.items.some((i) => i.status === 'ALTERED') ?? false;
  const anyAccepted = order?.items.some((i) => i.status === 'ACCEPTED') ?? false;

  const acceptDisabled =
    confirmOrderMut.isPending || anyPending || (!anyAltered && !anyAccepted);

  const startModify = () => {
    if (!order) return;
    const m: Record<string, string> = {};
    for (const it of order.items) {
      m[it.id] = String(it.requestedQty);
    }
    setModifyQty(m);
    setModifyMode(true);
  };

  const submitModify = () => {
    if (!order) return;
    const items: { itemId: string; requestedQty: number }[] = [];
    for (const it of order.items) {
      const raw = modifyQty[it.id];
      const n = parseInt(raw ?? '', 10);
      if (Number.isNaN(n) || n < 1) {
        toast.error('Each line needs a valid quantity (min 1)');
        return;
      }
      if (n !== it.requestedQty) items.push({ itemId: it.id, requestedQty: n });
    }
    if (items.length === 0) {
      toast.error('Change at least one quantity');
      return;
    }
    modifyMut.mutate(items);
  };

  if (isPending) return <PageSpinner />;
  if (isError) {
    return (
      <>
        <Header title="Order" showBack />
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 text-center">
          <p className="text-sm font-medium text-red-600">{apiErrorMessage(loadError, 'Could not load this order')}</p>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="mt-6 text-sm font-semibold text-primary-600"
          >
            Back to orders
          </button>
        </div>
      </>
    );
  }
  if (!order) {
    return (
      <>
        <Header title="Order" showBack />
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 text-center text-sm text-gray-600">Order not found.</div>
      </>
    );
  }

  const isDirectOrder = order.orderMode === 'DIRECT';
  const showTakeControl =
    isTrader && isDirectOrder && isAssignedTraderOnOrder && order.status === 'PENDING';

  return (
    <>
      <Header title={`Order #${order.id.slice(-6).toUpperCase()}`} showBack />
      <div
        className={`mx-auto max-w-4xl px-4 pt-4 space-y-4 ${traderCanAdjust ? 'pb-44' : 'pb-36'}`}
      >
        {isCustomer && decision?.actionRequired && (
          <div
            role="status"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
          >
            Action required: vendor has responded — review and accept or adjust your order.
          </div>
        )}

        {isTrader && traderStage?.actionRequired && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
            <span className="font-bold">Action required</span>
            <span className="block text-xs mt-0.5 opacity-90">{traderStage.detail}</span>
          </div>
        )}

        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              {isCustomer && decision ? (
                <Badge className={`mt-1 ${decision.badgeClass}`}>{decision.headline}</Badge>
              ) : isTrader && traderStage ? (
                <div className="mt-1 space-y-1">
                  <Badge className="bg-primary-100 text-primary-800">{traderStage.stageLabel}</Badge>
                  <p className="text-xs text-gray-500">{traderStage.detail}</p>
                </div>
              ) : (
                <Badge className="mt-1 bg-gray-100 text-gray-800">{order.status}</Badge>
              )}
              {isCustomer && decision?.subline && (
                <p className="mt-2 text-xs text-gray-600">{decision.subline}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Placed</p>
              <p className="text-sm font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={order.orderMode === 'MANAGED' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}>
              {order.orderMode === 'MANAGED' ? 'Managed' : 'Direct'}
            </Badge>
            {order.orderMode === 'MANAGED' && order.trader && (
              <span className="text-sm text-gray-700">
                Managed via <span className="font-semibold">{order.trader.businessName || order.trader.name}</span>
              </span>
            )}
            {order.orderMode === 'DIRECT' && order.trader && (
              <span className="text-sm text-gray-700">
                Trader on order:{' '}
                <span className="font-semibold">{order.trader.businessName || order.trader.name}</span>
              </span>
            )}
          </div>

          {isCustomer && !order.traderId && (
            <div
              role="note"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            >
              <p className="font-semibold">No trader is linked to this order</p>
              <p className="mt-1 text-amber-900/90 leading-relaxed">
                Assignment happens at <span className="font-medium">checkout</span>: the buyer follows the trader in{' '}
                <span className="font-medium">Network</span> (buyer → Follow trader), or uses the trader&apos;s shared
                catalog / managed checkout so <span className="font-medium">traderId</span> is sent with the order. A{' '}
                <span className="font-medium">vendor</span> following a trader does not attach that trader to customer
                orders, and vendors do not enter favored prices — that screen is for the trader account.
              </p>
            </div>
          )}

          {order.note && <p className="text-sm text-gray-600">Note: {order.note}</p>}
        </div>

        {showTakeControl && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-800">Direct order — you can take control to manage it.</p>
            <Button className="mt-3 w-full min-h-[48px]" onClick={() => takeControl.mutate()} loading={takeControl.isPending}>
              <Shield className="h-4 w-4 mr-1.5" />
              Take control
            </Button>
          </div>
        )}

        {isTrader &&
          isAssignedTraderOnOrder &&
          !traderCanAdjust &&
          !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(order.status) && (
            <div
              role="note"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
            >
              <p className="font-semibold">Favored price &amp; trader line edits are not on this screen right now</p>
              <p className="mt-1.5 text-amber-900/90 leading-relaxed">
                They appear in <span className="font-medium">Trader review</span> only while{' '}
                <span className="font-medium">every line is still waiting on suppliers</span>, or on a{' '}
                <span className="font-medium">managed</span> order before you tap &quot;Send to vendors&quot;. Use the
                Orders list &quot;All&quot; or &quot;Direct&quot; to open direct orders. After suppliers respond, adjust
                pricing from each line card below (for example counter-offers when a line is altered).
              </p>
            </div>
          )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Items ({order.items.length})</h3>
          {traderCanAdjust && traderOfferUnitPriceEditable && (
            <p className="mb-3 text-xs text-primary-800 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2">
              <span className="font-semibold">Favored pricing:</span> enter your favored unit price in the highlighted
              box on each item, then use <span className="font-semibold">Save changes</span> in the bar at the bottom
              of the screen.
            </p>
          )}
          <div className="space-y-3">
            {order.items.map((item) =>
              modifyMode && isCustomer ? (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 flex gap-3">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                    {item.product.images?.[0] ? (
                      <img src={mediaUrl(item.product.images[0])} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <label className="block text-xs text-gray-600">Requested quantity</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      value={modifyQty[item.id] ?? ''}
                      onChange={(e) => setModifyQty((m) => ({ ...m, [item.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <VendorResponseCard
                  key={item.id}
                  item={item}
                  customerQtyLabels
                  negotiationContext={
                    user
                      ? {
                          orderMode: order.orderMode ?? 'DIRECT',
                          traderId: order.traderId,
                          viewerUserId: user.id,
                          viewerRole: user.role,
                        }
                      : undefined
                  }
                  traderFavoredPriceEdit={
                    traderCanAdjust && traderOfferUnitPriceEditable
                      ? {
                          value: traderDraft.unitPrice[item.id] ?? '',
                          onChange: (next) =>
                            setTraderDraft((d) => ({
                              ...d,
                              unitPrice: { ...d.unitPrice, [item.id]: next },
                            })),
                        }
                      : undefined
                  }
                />
              ),
            )}
          </div>
        </div>

        {traderCanAdjust && (
          <div className="rounded-xl border border-primary-200 bg-primary-50/90 p-4 space-y-3">
            <p className="text-sm font-bold text-primary-950">Trader review</p>
            {!order.releasedToVendorsAt && order.orderMode === 'MANAGED' ? (
              <p className="text-xs text-primary-900">
                This managed order is only visible to you until you send it to vendors. Favored prices are set on each
                item card above; adjust quantities and note here.
              </p>
            ) : (
              <p className="text-xs text-primary-900">
                Vendors have not updated this order yet. Favored prices are on each item above — use this section for
                quantities and the order note.
              </p>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Order note</label>
              <textarea
                value={traderDraft.note}
                onChange={(e) => setTraderDraft((d) => ({ ...d, note: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                placeholder="Note for vendors or internal context"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Quantities (per line)</p>
              {order.items.map((it) => (
                <div key={it.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex-1 text-xs text-gray-800 truncate min-w-0">{it.product.name}</span>
                  <label className="flex flex-col gap-0.5 sm:items-end">
                    <span className="text-[10px] font-semibold text-gray-500 sm:sr-only">Qty</span>
                    <input
                      type="number"
                      min={1}
                      aria-label={`Quantity for ${it.product.name}`}
                      placeholder="Qty"
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-white sm:text-right"
                      value={traderDraft.qty[it.id] ?? ''}
                      onChange={(e) =>
                        setTraderDraft((d) => ({ ...d, qty: { ...d.qty, [it.id]: e.target.value } }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
            {!order.releasedToVendorsAt && order.orderMode === 'MANAGED' && (
              <Button
                variant="secondary"
                className="w-full min-h-[48px]"
                loading={releaseMut.isPending}
                onClick={() => releaseMut.mutate()}
              >
                Send to vendors
              </Button>
            )}
            <p className="text-[11px] text-gray-500 text-center sm:hidden">
              Save favored prices &amp; qty from the bar below.
            </p>
          </div>
        )}

        {totals && <OrderSummary {...totals} />}

        {isCustomer && ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED'].includes(order.status) && (
          <Button
            className="w-full min-h-[48px]"
            variant="secondary"
            onClick={() => {
              selectAll(
                order.items.map((i) => i.productId),
                order.traderId
                  ? { traderId: order.traderId, orderMode: order.orderMode ?? 'DIRECT' }
                  : null,
              );
              navigate('/bulk-order');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reorder
          </Button>
        )}

        {modifyMode && isCustomer && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 min-h-[48px]" onClick={() => { setModifyMode(false); setModifyQty({}); }}>
              Cancel edit
            </Button>
            <Button className="flex-1 min-h-[48px]" loading={modifyMut.isPending} onClick={submitModify}>
              Save & resend to vendors
            </Button>
          </div>
        )}
      </div>

      {showCustomerFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-4xl flex flex-col gap-2">
            <p className="text-center text-[11px] font-medium text-gray-500">
              {decision?.actionRequired ? 'Next: accept or adjust' : 'Waiting on vendors — you can still revise or cancel'}
            </p>
            <Button
              className="w-full min-h-[52px] text-base font-semibold"
              onClick={() => confirmOrderMut.mutate()}
              loading={confirmOrderMut.isPending}
              disabled={acceptDisabled}
            >
              Accept order
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="min-h-[48px]" disabled={!canModify} onClick={startModify}>
                Modify request
              </Button>
              <Button
                variant="danger"
                className="min-h-[48px]"
                loading={cancelMut.isPending}
                onClick={() => {
                  if (window.confirm('Cancel this order? Vendors will be notified.')) cancelMut.mutate();
                }}
              >
                Cancel order
              </Button>
            </div>
          </div>
        </div>
      )}

      {traderCanAdjust && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-primary-200 bg-primary-50/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-[11px] font-medium text-primary-900 mb-2">
              Saves favored prices, quantities, and note together
            </p>
            <Button
              className="w-full min-h-[52px] text-base font-semibold"
              loading={traderAdjustMut.isPending}
              onClick={submitTraderAdjust}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
