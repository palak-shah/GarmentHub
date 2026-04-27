import { formatPrice } from '@/utils/formatters';

export function OrderSummary({
  itemCount,
  requestedTotal,
  approvedTotal,
  priceTotal,
  requestedPriceTotal,
  className = '',
}: {
  itemCount: number;
  requestedTotal: number;
  approvedTotal: number;
  priceTotal: number | null;
  /** Shown when lines are still pending but unit prices are known (e.g. trader favored price). */
  requestedPriceTotal?: number | null;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Order summary</p>
      <dl className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600">Items</dt>
          <dd className="font-semibold text-gray-900">{itemCount}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600">Requested qty</dt>
          <dd className="font-semibold text-gray-900">{requestedTotal} units</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-600">Approved / offered qty</dt>
          <dd className="font-semibold text-gray-900">{approvedTotal} units</dd>
        </div>
        {requestedPriceTotal != null && requestedPriceTotal !== priceTotal && (
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-200">
            <dt className="text-gray-600">Est. by requested qty</dt>
            <dd className="font-semibold text-gray-900">{formatPrice(requestedPriceTotal)}</dd>
          </div>
        )}
        {priceTotal != null && (
          <div className="flex justify-between gap-4 pt-1 border-t border-gray-200">
            <dt className="text-gray-600">Est. total</dt>
            <dd className="font-semibold text-gray-900">{formatPrice(priceTotal)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
