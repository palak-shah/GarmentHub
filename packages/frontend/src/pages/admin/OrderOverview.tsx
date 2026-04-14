import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { orderStatusConfig, formatDate } from '@/utils/formatters';

export default function AdminOrderOverview() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => adminApi.getAllOrders(),
  });

  return (
    <>
      <Header title="All Orders" />
      <div className="mx-auto max-w-4xl px-4 py-4">
        {isLoading ? (
          <PageSpinner />
        ) : !orders || orders.length === 0 ? (
          <EmptyState title="No orders" />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const statusCfg = orderStatusConfig[order.status];
              return (
                <div key={order.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Order #{order.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.customer?.businessName || order.customer?.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </div>

                  <div className="mt-3 space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate flex-1">{item.product.name}</span>
                        <span className="ml-2">×{item.requestedQty}</span>
                        <span className="ml-2 text-gray-400">
                          → {item.vendor?.businessName || item.vendor?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
