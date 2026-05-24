import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, Plus, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { vendorApi } from '@/api/vendor.api';
import { useAuthStore } from '@/store/authStore';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { mediaUrl } from '@/utils/mediaUrl';
import { formatPrice } from '@/utils/formatters';
import { apiErrorMessage } from '@/utils/apiError';

export default function VendorDashboard() {
  useScrollRestore('vendor-dashboard');
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: products,
    isPending: productsPending,
    isError: isProductsQueryError,
    error: productsQueryError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['vendor-products', userId],
    queryFn: () => productApi.getMyProducts(),
    enabled: !!userId,
  });

  const loadingProducts = !!userId && productsPending;

  const { data: orderItems, isLoading: loadingOrders } = useQuery({
    queryKey: ['vendor-orders', userId],
    queryFn: () => vendorApi.getIncomingOrders(),
    enabled: !!userId,
  });

  const pendingOrders = orderItems?.filter((i) => i.status === 'PENDING').length || 0;
  const isLoading = !userId || loadingProducts || loadingOrders;

  const recentProducts = useMemo(
    () => (products ?? [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6),
    [products],
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
  };

  if (isLoading && !products && !orderItems && !isProductsQueryError) {
    return (
      <>
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 py-2.5">
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
            <div className="flex-1" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 h-20 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
          <div className="h-11 animate-pulse rounded-lg bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 py-2.5">
          <h1 className="text-lg font-bold text-gray-900 shrink-0">
            {user?.name?.split(' ')[0] || 'Dashboard'}
          </h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/vendor/products/new')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white active:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button onClick={handleRefresh} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-4xl pb-4">
        {isProductsQueryError && (
          <div className="mx-4 mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-red-800">Couldn’t load products</p>
            <p className="mt-1 text-xs text-red-700/90">{apiErrorMessage(productsQueryError, 'Something went wrong')}</p>
            <button
              type="button"
              onClick={() => void refetchProducts()}
              className="mt-3 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white active:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Compact stats strip */}
        <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-hide border-b border-gray-100">
          <button
            onClick={() => navigate('/vendor/products')}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 active:bg-gray-200 min-h-[38px]"
          >
            <Package className="h-4 w-4 text-primary-500" />
            {products?.length || 0} Products
          </button>
          <button
            onClick={() => navigate('/vendor/orders')}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 active:bg-gray-200 min-h-[38px]"
          >
            <ClipboardList className="h-4 w-4 text-orange-500" />
            {orderItems?.length || 0} Orders
          </button>
          {pendingOrders > 0 && (
            <button
              onClick={() => navigate('/vendor/orders')}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700 active:bg-yellow-100 min-h-[38px]"
            >
              <Clock className="h-4 w-4 text-yellow-500" />
              {pendingOrders} Pending
            </button>
          )}
        </div>

        {/* Recent products */}
        <div className="px-4 pt-4 space-y-4">
          {!isProductsQueryError && recentProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between pb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent uploads</p>
                <button
                  onClick={() => navigate('/vendor/products')}
                  className="flex items-center gap-0.5 text-xs font-semibold text-primary-600 active:text-primary-700"
                >
                  View all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {recentProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/vendor/products/${p.id}/edit`)}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100/80 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={mediaUrl(p.images[0])} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300 text-xs">No image</div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold text-gray-900">{p.name || 'Untitled'}</p>
                      <p className="text-[10px] text-gray-500">{formatPrice(p.price, p.priceMax)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Empty state for vendors with no products */}
          {!isProductsQueryError && (!products || products.length === 0) && (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-3">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No products yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload your first product to get started</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
