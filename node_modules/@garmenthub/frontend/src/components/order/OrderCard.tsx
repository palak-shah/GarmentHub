import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { orderStatusConfig, formatDate } from '@/utils/formatters';
import type { Order } from '@/types';

export function OrderCard({ order }: { order: Order }) {
  const statusCfg = orderStatusConfig[order.status];

  return (
    <Link
      to={`/orders/${order.id}`}
      className="block rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Order #{order.id.slice(-6).toUpperCase()}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
      </div>

      <div className="mt-3 space-y-1.5">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
              {item.product.images?.[0] ? (
                <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <span className="flex-1 truncate text-gray-700">{item.product.name}</span>
            <span className="text-xs text-gray-500">×{item.requestedQty}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>
        )}
      </div>
    </Link>
  );
}
