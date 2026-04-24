import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { OrderCard } from '@/components/order/OrderCard';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Order } from '@/types';

export default function CustomerOrders() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => orderApi.list() as Promise<Order[]>,
    enabled: !!userId,
  });

  return (
    <>
      <Header title="My Orders" />
      <div className="mx-auto max-w-4xl px-4 py-4">
        {!userId || isLoading ? (
          <PageSpinner />
        ) : !orders || orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Your order history will appear here"
            icon={<ClipboardList className="h-16 w-16" />}
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
