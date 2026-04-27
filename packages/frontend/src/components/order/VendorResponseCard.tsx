import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { itemStatusConfig, formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import { orderApi } from '@/api/order.api';
import { approvedQtyForLine, lineApprovedQtyLabel } from '@/lib/orderWorkflow';
import type { OrderItem, OrderMode, Role } from '@/types';

function inrUnit(n: number): string {
  return `₹${n.toLocaleString('en-IN')}/unit`;
}

export interface VendorResponseNegotiationContext {
  orderMode: OrderMode;
  traderId?: string | null;
  viewerUserId: string;
  viewerRole: Role;
}

export function VendorResponseCard({
  item,
  negotiationContext,
  customerQtyLabels,
  traderFavoredPriceEdit,
}: {
  item: OrderItem;
  negotiationContext?: VendorResponseNegotiationContext;
  /** Clear Requested / Offered vs Accepted copy for customer decision screen */
  customerQtyLabels?: boolean;
  /** When set, shows a high-visibility favored-price field for the assigned trader. */
  traderFavoredPriceEdit?: { value: string; onChange: (next: string) => void };
}) {
  const queryClient = useQueryClient();
  const [suggestPrice, setSuggestPrice] = useState('');

  const viewerIsAssignedTrader =
    negotiationContext?.viewerRole === 'TRADER' &&
    negotiationContext.traderId != null &&
    String(negotiationContext.traderId) === String(negotiationContext.viewerUserId);

  const showTraderCounter =
    viewerIsAssignedTrader &&
    negotiationContext?.orderMode === 'MANAGED' &&
    item.status === 'ALTERED' &&
    item.agreedUnitPrice == null;

  useEffect(() => {
    setSuggestPrice(
      item.traderCounterUnitPrice != null ? String(item.traderCounterUnitPrice) : '',
    );
  }, [item.id, item.traderCounterUnitPrice]);

  const counterMutation = useMutation({
    mutationFn: (unitPrice: number) => orderApi.setTraderCounterPrice(item.id, unitPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', item.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Suggested price sent');
    },
    onError: () => toast.error('Could not save price'),
  });

  const statusCfg = itemStatusConfig[item.status];
  const listLabel = formatPrice(item.product.price, item.product.priceMax);
  const showPricingBlock =
    item.traderTargetUnitPrice != null ||
    item.offeredUnitPrice != null ||
    item.traderCounterUnitPrice != null ||
    item.agreedUnitPrice != null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {item.product.images?.[0] ? (
            <img src={mediaUrl(item.product.images[0])} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h4>
          <p className="text-xs text-gray-500">
            {item.vendor?.businessName || item.vendor?.name}
          </p>
          {item.product.price != null && (
            <p className="text-xs text-gray-500">List: {listLabel} /unit</p>
          )}
        </div>
        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
      </div>

      {traderFavoredPriceEdit && (
        <div className="mt-3 rounded-xl border-2 border-primary-500 bg-primary-50 px-3 py-3 shadow-sm">
          <label className="block text-xs font-extrabold uppercase tracking-wide text-primary-950">
            Favored price / unit
          </label>
          <p className="mt-1 text-[11px] leading-snug text-primary-900/85">
            Your favored figure for this line (buyer-facing). Leave blank to use list price. Tap &quot;Save changes&quot;
            in the bar at the bottom.
          </p>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={traderFavoredPriceEdit.value}
            onChange={(e) => traderFavoredPriceEdit.onChange(e.target.value)}
            placeholder="e.g. 125"
            className="mt-2 w-full min-h-[48px] rounded-lg border-2 border-primary-200 bg-white px-3 text-base font-semibold text-gray-900 focus:border-primary-500 focus:outline-none"
            aria-label={`Favored unit price for ${item.product.name}`}
          />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Requested</div>
          <div className="font-semibold">{item.requestedQty} units</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">
            {customerQtyLabels
              ? item.status === 'PENDING'
                ? 'Vendor response'
                : lineApprovedQtyLabel(item.status)
              : 'Accepted'}
          </div>
          <div className="font-semibold">
            {customerQtyLabels && item.status === 'REJECTED'
              ? '—'
              : customerQtyLabels && item.status === 'PENDING'
                ? '—'
                : `${approvedQtyForLine(item)} units`}
          </div>
        </div>
      </div>

      {showPricingBlock && (
        <div className="mt-3 space-y-1 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs">
          <p className="font-medium text-gray-700">Pricing</p>
          {item.traderTargetUnitPrice != null && (
            <p className="text-gray-600">
              Trader favored:{' '}
              <span className="font-semibold text-gray-900">{inrUnit(item.traderTargetUnitPrice)}</span>
            </p>
          )}
          {item.offeredUnitPrice != null && (
            <p className="text-gray-600">
              Vendor offer: <span className="font-semibold text-gray-900">{inrUnit(item.offeredUnitPrice)}</span>
            </p>
          )}
          {item.traderCounterUnitPrice != null && (
            <p className="text-gray-600">
              Trader suggested:{' '}
              <span className="font-semibold text-gray-900">{inrUnit(item.traderCounterUnitPrice)}</span>
            </p>
          )}
          {item.agreedUnitPrice != null && (
            <p className="text-emerald-800">
              Agreed: <span className="font-semibold">{inrUnit(item.agreedUnitPrice)}</span>
            </p>
          )}
        </div>
      )}

      {showTraderCounter && (
        <div className="mt-3 space-y-2 rounded-lg border border-primary-100 bg-primary-50/50 p-3">
          <p className="text-xs font-medium text-primary-900">Suggest a price (per unit)</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={suggestPrice}
              onChange={(e) => setSuggestPrice(e.target.value)}
              placeholder="e.g. 120"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <Button
              size="sm"
              className="shrink-0"
              loading={counterMutation.isPending}
              disabled={(() => {
                const n = parseFloat(suggestPrice);
                return Number.isNaN(n) || n <= 0;
              })()}
              onClick={() => counterMutation.mutate(parseFloat(suggestPrice))}
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {item.vendorNote && (
        <p className="mt-2 text-xs text-gray-600 italic">"{item.vendorNote}"</p>
      )}
    </div>
  );
}
