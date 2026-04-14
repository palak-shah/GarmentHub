import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { Header } from '@/components/layout/Header';
import { ProductCard } from '@/components/product/ProductCard';
import { FilterDrawer, type ActiveFilters } from '@/components/product/FilterDrawer';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProductListing() {
  const [params] = useSearchParams();
  const initialCategory = params.get('categoryId') || undefined;
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>({ categoryId: initialCategory });
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => ({
    search: search || undefined,
    ...filters,
    page,
    limit: 20,
  }), [search, filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productApi.list(queryParams),
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['filters'],
    queryFn: () => productApi.getFilters(),
  });

  return (
    <>
      <Header title="Search Products" showBack />
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <FilterDrawer options={filterOptions} filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
        </div>

        {data && (
          <p className="mt-3 text-xs text-gray-500">{data.pagination.total} products found</p>
        )}

        {isLoading ? (
          <PageSpinner />
        ) : data?.products.length === 0 ? (
          <EmptyState title="No products found" description="Try adjusting your search or filters" />
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data?.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {data && data.pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  {page} of {data.pagination.pages}
                </span>
                <button
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
