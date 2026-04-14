import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, Plus, Clock } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { vendorApi } from '@/api/vendor.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';

export default function VendorDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: () => productApi.getMyProducts(),
  });

  const { data: orderItems, isLoading: loadingOrders } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => vendorApi.getIncomingOrders(),
  });

  const pendingOrders = orderItems?.filter((i) => i.status === 'PENDING').length || 0;
  const isLoading = loadingProducts || loadingOrders;

  if (isLoading) return <><Header title="Dashboard" /><PageSpinner /></>;

  return (
    <>
      <Header title={`Hi, ${user?.name || 'Vendor'}`} />
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <Package className="h-8 w-8 text-primary-500" />
            <p className="mt-2 text-2xl font-bold">{products?.length || 0}</p>
            <p className="text-xs text-gray-500">Products</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <ClipboardList className="h-8 w-8 text-orange-500" />
            <p className="mt-2 text-2xl font-bold">{orderItems?.length || 0}</p>
            <p className="text-xs text-gray-500">Total Order Items</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm col-span-2">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-xs text-gray-500">Pending Responses</p>
              </div>
              {pendingOrders > 0 && (
                <Button size="sm" className="ml-auto" onClick={() => navigate('/vendor/orders')}>
                  View
                </Button>
              )}
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={() => navigate('/vendor/products/new')}>
          <Plus className="h-4 w-4" />
          Add New Product
        </Button>
      </div>
    </>
  );
}
