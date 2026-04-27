import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '@/api/vendor.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemStatusConfig, formatDate, formatPrice } from '@/utils/formatters';

export default function VendorOrderHistory() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: items, isLoading } = useQuery({
    queryKey: ['vendor-orders', userId],
    queryFn: () => vendorApi.getIncomingOrders(),
    enabled: !!userId,
  });

  const completed = items?.filter((i) => i.status !== 'PENDING') || [];

  return (
    <>
      <Header title="Order History" showBack />
      <div className="mx-auto max-w-4xl px-4 py-4">
        {!userId || isLoading ? (
          <PageSpinner />
        ) : completed.length === 0 ? (
          <EmptyState title="No order history" description="Completed orders will appear here" />
        ) : (
          <div className="space-y-3">
            {completed.map((item) => {
              const statusCfg = itemStatusConfig[item.status];
              return (
                <div key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium">{item.product.name}</h4>
                      <p className="text-xs text-gray-500">
                        {item.order?.customer.businessName || item.order?.customer.name}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(item.respondedAt || item.createdAt!)}</p>
                    </div>
                    <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-gray-500">Requested: </span>
                        <span className="font-semibold text-gray-900">{item.requestedQty} units</span>
                      </div>
                      <div className="text-right text-xs space-y-0.5">
                        {item.product.price != null && (
                          <p className="text-gray-500">
                            List: {formatPrice(item.product.price, item.product.priceMax)}/unit
                          </p>
                        )}
                        {item.traderTargetUnitPrice != null && (
                          <p className="font-semibold text-primary-900">
                            Trader to customer: {formatPrice(item.traderTargetUnitPrice)}/unit
                          </p>
                        )}
                      </div>
                    </div>
                    {item.acceptedQty != null ? (
                      <div>
                        <span className="text-gray-500">Offered / accepted: </span>
                        <span className="font-semibold text-gray-900">{item.acceptedQty} units</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">No accepted quantity (e.g. rejected line)</div>
                    )}
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
