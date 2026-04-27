import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { orderStatusConfig, formatDate } from '@/utils/formatters';
import { getCustomerOrderDecisionLabel, getTraderOrderStage } from '@/lib/orderWorkflow';
import { mediaUrl } from '@/utils/mediaUrl';
import { useAuthStore } from '@/store/authStore';
import type { Order } from '@/types';

export function OrderCard({ order }: { order: Order }) {
  const role = useAuthStore((s) => s.user?.role);
  const statusCfg = orderStatusConfig[order.status];

  let headline = statusCfg.label;
  let badgeClass = statusCfg.color;
  let sub: string | undefined;
  if (role === 'CUSTOMER') {
    const d = getCustomerOrderDecisionLabel(order, order.items);
    headline = d.headline;
    badgeClass = d.badgeClass;
    if (d.actionRequired) sub = 'Action required';
  } else if (role === 'TRADER') {
    const t = getTraderOrderStage(order, order.items);
    headline = t.stageLabel;
    badgeClass = t.actionRequired ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700';
    sub = t.detail;
  }

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
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
            <Badge className={order.orderMode === 'MANAGED' ? 'bg-primary-100 text-primary-700 text-[10px] px-1.5 py-0' : 'bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0'}>
              {order.orderMode === 'MANAGED' ? 'Managed' : 'Direct'}
            </Badge>
          </div>
          {order.trader && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              via {order.trader.businessName || order.trader.name}
            </p>
          )}
        </div>
        <div className="text-right">
          <Badge className={badgeClass}>{headline}</Badge>
          {sub && <p className="mt-1 max-w-[140px] text-[10px] text-gray-500 leading-tight ml-auto">{sub}</p>}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
              {item.product.images?.[0] ? (
                <img src={mediaUrl(item.product.images[0])} alt="" className="h-full w-full object-cover" />
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
