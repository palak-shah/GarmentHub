import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '@/api/vendor.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { itemStatusConfig, formatDate, formatPrice } from '@/utils/formatters';

export default function VendorOrderHistory() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => vendorApi.getIncomingOrders(),
  });

  const completed = items?.filter((i) => i.status !== 'PENDING') || [];

  return (
    <>
      <Header title="Order History" showBack />
      <div className="mx-auto max-w-4xl px-4 py-4">
        {isLoading ? (
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
                  <div className="mt-2 flex gap-4 text-sm text-gray-600">
                    <span>Requested: {item.requestedQty}</span>
                    <span>Accepted: {item.acceptedQty ?? '—'}</span>
                    {item.product.price && <span>{formatPrice(item.product.price)}/unit</span>}
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
