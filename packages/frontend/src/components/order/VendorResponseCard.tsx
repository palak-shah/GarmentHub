import { Badge } from '@/components/ui/Badge';
import { itemStatusConfig, formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import type { OrderItem } from '@/types';

export function VendorResponseCard({ item }: { item: OrderItem }) {
  const statusCfg = itemStatusConfig[item.status];

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
          {item.product.price && (
            <p className="text-xs text-gray-500">{formatPrice(item.product.price)} /unit</p>
          )}
        </div>
        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Requested</div>
          <div className="font-semibold">{item.requestedQty} units</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Accepted</div>
          <div className="font-semibold">{item.acceptedQty ?? '—'} units</div>
        </div>
      </div>

      {item.vendorNote && (
        <p className="mt-2 text-xs text-gray-600 italic">"{item.vendorNote}"</p>
      )}
    </div>
  );
}
