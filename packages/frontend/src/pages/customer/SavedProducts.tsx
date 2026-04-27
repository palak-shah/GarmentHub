import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { useSelectionStore } from '@/store/selectionStore';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { Header } from '@/components/layout/Header';
import { ProductCard } from '@/components/product/ProductCard';
import { SelectionActionBar } from '@/components/product/SelectionActionBar';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SavedProducts() {
  useScrollRestore('saved-products');
  const isSelecting = useSelectionStore((s) => s.isSelecting);

  const { data: products, isLoading } = useQuery({
    queryKey: ['saved-products'],
    queryFn: () => productApi.getSavedProducts(),
  });

  return (
    <>
      <Header title="Saved" />

      <div className="mx-auto max-w-4xl px-4 py-4">
        {isLoading && !products ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <EmptyState
            title="Nothing saved"
            description="Save products to find them here"
            icon={<Bookmark className="h-16 w-16" />}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {isSelecting && <SelectionActionBar />}
    </>
  );
}
