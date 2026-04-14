import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { orderApi } from '@/api/order.api';
import { Header } from '@/components/layout/Header';
import { VendorResponseCard } from '@/components/order/VendorResponseCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { orderStatusConfig, formatDateTime } from '@/utils/formatters';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(id!),
    enabled: !!id,
  });

  const confirm = useMutation({
    mutationFn: () => orderApi.confirm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order confirmed');
    },
    onError: () => toast.error('Failed to confirm'),
  });

  if (isLoading) return <PageSpinner />;
  if (!order) return null;

  const statusCfg = orderStatusConfig[order.status];
  const hasAltered = order.items.some((i) => i.status === 'ALTERED');

  return (
    <>
      <Header title={`Order #${order.id.slice(-6).toUpperCase()}`} showBack />
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge className={`mt-1 ${statusCfg.color}`}>{statusCfg.label}</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Placed on</p>
              <p className="text-sm font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          {order.note && (
            <p className="mt-3 text-sm text-gray-600">Note: {order.note}</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Items ({order.items.length})</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <VendorResponseCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {hasAltered && (
          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-800">
              Some items have been altered by vendors.
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Review the changes and confirm to proceed.
            </p>
            <Button
              className="mt-3 w-full"
              onClick={() => confirm.mutate()}
              loading={confirm.isPending}
            >
              Confirm Altered Order
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
