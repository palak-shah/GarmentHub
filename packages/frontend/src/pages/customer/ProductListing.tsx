import { useRef, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, CheckCircle2, Circle, MousePointerClick, X } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { curationApi } from '@/api/curation.api';
import { useSelectionStore } from '@/store/selectionStore';
import { useMarkSeen } from '@/hooks/useMarkSeen';
import { ProductCard } from '@/components/product/ProductCard';
import { SelectionActionBar } from '@/components/product/SelectionActionBar';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Product } from '@/types';

export default function ProductListing() {
  const [params] = useSearchParams();
  const initialCategory = params.get('categoryId') || undefined;
  const vendorId = params.get('vendorId') || undefined;
  const traderId = params.get('traderId') || undefined;
  const traderName = params.get('traderName') || undefined;
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { isSelecting, selectedIds, selectAll, deselectAll, clearSelection } = useSelectionStore();
  const { onVisible, onHidden } = useMarkSeen();

  const isTraderView = !!traderId;

  // Standard product listing query
  const queryParams = useMemo(() => ({
    search: search || undefined,
    vendorId,
    categoryId: initialCategory,
    page,
    limit: 20,
  }), [search, vendorId, initialCategory, page]);

  const { data, isLoading: listLoading } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productApi.list(queryParams),
    enabled: !isTraderView,
  });

  // Trader curated shares query
  const { data: curatedShares, isLoading: curatedLoading } = useQuery({
    queryKey: ['curated-received'],
    queryFn: () => curationApi.listReceived(),
    enabled: isTraderView,
  });

  // Extract products from this trader's curated shares, deduped, latest first
  const traderProducts = useMemo(() => {
    if (!isTraderView || !curatedShares) return [];
    const seen = new Set<string>();
    const products: Product[] = [];
    const sorted = [...curatedShares]
      .filter((s) => s.trader.id === traderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const share of sorted) {
      for (const p of share.products) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          products.push(p);
        }
      }
    }
    return products;
  }, [curatedShares, traderId, isTraderView]);

  // Filter by search text
  const filteredTraderProducts = useMemo(() => {
    if (!search) return traderProducts;
    const q = search.toLowerCase();
    return traderProducts.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q) ||
      String(p.price).includes(q)
    );
  }, [traderProducts, search]);

  const isLoading = isTraderView ? curatedLoading : listLoading;
  const displayProducts = isTraderView ? filteredTraderProducts : (data?.products ?? []);
  const ids = displayProducts.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const hasMore = !isTraderView && data ? page < data.pagination.pages : false;

  const headerTitle = traderName ? decodeURIComponent(traderName) : undefined;

  return (
    <>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 py-2.5">
          {isSelecting ? (
            <>
              <button onClick={clearSelection} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100">
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm font-bold text-gray-900 shrink-0">{selectedIds.size}</span>
            </>
          ) : (
            <>
              <button onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100">
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              {headerTitle && (
                <span className="text-sm font-bold text-gray-900 shrink-0 truncate max-w-[120px]">{headerTitle}</span>
              )}
            </>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
              autoFocus={!isTraderView}
            />
            {search && (
              <button onClick={() => { setSearch(''); inputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {isSelecting ? (
            <button
              onClick={() => (allSelected ? deselectAll(ids) : selectAll(ids, null))}
              className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold active:bg-gray-200"
            >
              {allSelected ? <CheckCircle2 className="h-4 w-4 text-primary-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
              All
            </button>
          ) : ids.length > 0 ? (
            <button
              onClick={() => selectAll([ids[0]], null)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-600 px-3 py-2 text-sm font-semibold text-white active:bg-primary-700"
            >
              <MousePointerClick className="h-4 w-4" />
              Select
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-4xl pb-4">
        {isLoading ? (
          <PageSpinner />
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-base font-medium">
              {isTraderView ? 'No products shared yet' : 'Nothing found'}
            </p>
            <p className="text-sm mt-1">
              {isTraderView ? 'This trader hasn\'t shared any products with you' : 'Try a different search'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 px-4 pt-3">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onVisible={onVisible}
                  onHidden={onHidden}
                />
              ))}
            </div>

            {hasMore && (
              <div className="px-4 mt-4">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full rounded-xl border-2 border-gray-200 py-3 text-sm font-semibold text-gray-600 active:bg-gray-50"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isSelecting && <SelectionActionBar />}
    </>
  );
}
