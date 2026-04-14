import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/utils/formatters';

export default function VendorProductList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: () => productApi.getMyProducts(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => productApi.bulkDelete(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success(`${data.deleted} product(s) deleted`);
      exitSelectMode();
    },
    onError: () => toast.error('Failed to delete products'),
  });

  const allSelected = useMemo(
    () => !!products && products.length > 0 && selected.size === products.length,
    [products, selected.size],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!products) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function enterSelectMode(firstId?: string) {
    setSelectMode(true);
    setSelected(firstId ? new Set([firstId]) : new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleBulkDelete() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (confirm(`Delete ${count} product${count > 1 ? 's' : ''}? This cannot be undone.`)) {
      bulkDeleteMut.mutate([...selected]);
    }
  }

  return (
    <>
      {selectMode ? (
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-primary-600 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <button onClick={exitSelectMode} className="rounded-full p-1 text-white hover:bg-primary-700">
              <X className="h-5 w-5" />
            </button>
            <span className="flex-1 text-sm font-medium text-white">
              {selected.size} selected
            </span>
            <button
              onClick={toggleSelectAll}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleBulkDelete}
              loading={bulkDeleteMut.isPending}
              disabled={selected.size === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </header>
      ) : (
        <Header
          title="My Products"
          actions={
            <div className="flex items-center gap-2">
              {products && products.length > 0 && (
                <button
                  onClick={() => enterSelectMode()}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Select
                </button>
              )}
              <Button size="sm" onClick={() => navigate('/vendor/products/new')}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          }
        />
      )}

      <div className="mx-auto max-w-4xl px-4 py-4">
        {isLoading ? (
          <PageSpinner />
        ) : !products || products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add your first product to start selling"
            action={<Button onClick={() => navigate('/vendor/products/new')}>Add Product</Button>}
          />
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const isSelected = selected.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={selectMode ? () => toggleSelect(product.id) : undefined}
                  className={`flex gap-3 rounded-xl bg-white p-3 shadow-sm transition-colors ${
                    selectMode ? 'cursor-pointer' : ''
                  } ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                >
                  {selectMode && (
                    <div className="flex items-center">
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-primary-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                    {product.brand && (
                      <p className="text-xs text-primary-600 font-medium truncate">{product.brand.name}</p>
                    )}
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatPrice(product.price)}</span>
                      <span>MOQ: {product.moq}</span>
                    </div>
                    <div className="mt-1">
                      <Badge className={product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                  {!selectMode && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => navigate(`/vendor/products/${product.id}/edit`)}
                        className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this product?')) deleteMut.mutate(product.id); }}
                        className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
