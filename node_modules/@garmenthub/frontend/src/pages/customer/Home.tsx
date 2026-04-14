import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { ProductCard } from '@/components/product/ProductCard';
import { PageSpinner } from '@/components/ui/Spinner';

export default function CustomerHome() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productApi.list({ limit: 10 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.getCategories(),
  });

  return (
    <>
      <Header title={`Hi, ${user?.name || 'there'}`} />
      <div className="mx-auto max-w-4xl px-4 py-4">
        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-sm"
        >
          <Search className="h-5 w-5" />
          Search products, fabrics, patterns...
        </button>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Categories</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/search?categoryId=${cat.id}`)}
                  className="shrink-0 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Latest Products */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900">Latest Products</h2>
          </div>
          {isLoading ? (
            <PageSpinner />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data?.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
