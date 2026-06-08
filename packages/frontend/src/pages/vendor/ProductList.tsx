import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, CheckSquare, Square, X, Hash, ToggleLeft, Camera, ImageMinus } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { uploadApi } from '@/api/upload.api';
import { useAuthStore } from '@/store/authStore';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ImageViewerLightbox } from '@/components/ui/ImageViewerLightbox';
import { formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';
import { apiErrorMessage } from '@/utils/apiError';

function productGalleryUrls(images: string[] | undefined): string[] {
  return [...new Set((images ?? []).map((s) => String(s).trim()).filter(Boolean))];
}

export default function VendorProductList() {
  useScrollRestore('vendor-products');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ urls: string[]; initialIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  const {
    data: products,
    isPending,
    isError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['vendor-products', userId],
    queryFn: () => productApi.getMyProducts(),
    enabled: !!userId,
  });

  const isLoading = !!userId && isPending;

  const triggerAddPhotos = useCallback((productId: string) => {
    uploadTargetRef.current = productId;
    fileInputRef.current?.click();
  }, []);

  const invalidateProductDetail = useCallback(
    (productId: string) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    [queryClient],
  );

  const handlePhotosSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    const productId = uploadTargetRef.current;
    e.target.value = '';
    if (!fileList.length || !productId || !products) return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setUploadingProductId(productId);
    try {
      const { urls } = await uploadApi.postProductImages(fileList, productId);
      if (urls.length === 0) {
        toast.error('No images were saved.');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      invalidateProductDetail(productId);
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploadingProductId(null);
      uploadTargetRef.current = null;
    }
  }, [products, queryClient, invalidateProductDetail]);

  const handleClearImages = useCallback(async (productId: string) => {
    if (!products) return;
    const product = products.find((p) => p.id === productId);
    if (!product || (product.images?.length ?? 0) <= 1) return;
    if (!confirm('Clear all photos except the cover (first image)?')) return;
    setUploadingProductId(productId);
    try {
      await productApi.update(productId, { images: [product.images![0]] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      invalidateProductDetail(productId);
      toast.success('Cleared — cover photo kept');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear photos');
    } finally {
      setUploadingProductId(null);
    }
  }, [products, queryClient, invalidateProductDetail]);

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

  const bulkUpdateMut = useMutation({
    mutationFn: (data: { ids: string[]; moq?: number; status?: string }) =>
      productApi.bulkUpdate(data.ids, { moq: data.moq, status: data.status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success(`${data.updated} product(s) updated`);
      setBulkAction(null);
    },
    onError: () => toast.error('Failed to update products'),
  });

  const [bulkAction, setBulkAction] = useState<'moq' | 'status' | null>(null);
  const [bulkMoqVal, setBulkMoqVal] = useState('');
  const [bulkStatus, setBulkStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');

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
    setBulkAction(null);
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotosSelected}
      />

      {selectMode ? (
        <>
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-2.5">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            <button onClick={exitSelectMode} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100">
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <span className="flex-1 text-sm font-bold text-gray-900">
              {selected.size}
            </span>
            <button
              onClick={toggleSelectAll}
              className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 active:bg-gray-200"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => setBulkAction('moq')}
              className="rounded-full p-2 text-gray-600 active:bg-gray-100"
              title="Set MOQ"
            >
              <Hash className="h-4 w-4" />
            </button>
            <button
              onClick={() => setBulkAction('status')}
              className="rounded-full p-2 text-gray-600 active:bg-gray-100"
              title="Toggle status"
            >
              <ToggleLeft className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleBulkDelete}
              loading={bulkDeleteMut.isPending}
              disabled={selected.size === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Bulk action sheet */}
        {bulkAction && (
          <div className="sticky top-[49px] z-20 border-b border-gray-100 bg-white px-4 py-2.5">
            <div className="mx-auto max-w-4xl flex items-center gap-3">
              {bulkAction === 'moq' && (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={bulkMoqVal}
                    onChange={(e) => setBulkMoqVal(e.target.value)}
                    placeholder="MOQ"
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-center"
                  />
                  <Button
                    size="sm"
                    disabled={!bulkMoqVal || parseInt(bulkMoqVal, 10) < 1 || selected.size === 0}
                    loading={bulkUpdateMut.isPending}
                    onClick={() => bulkUpdateMut.mutate({ ids: [...selected], moq: parseInt(bulkMoqVal, 10) })}
                  >
                    Apply
                  </Button>
                </>
              )}
              {bulkAction === 'status' && (
                <>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {(['ACTIVE', 'DRAFT'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setBulkStatus(s)}
                        className={`px-4 py-2 text-xs font-semibold ${bulkStatus === s ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                      >
                        {s === 'ACTIVE' ? 'Activate' : 'Deactivate'}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    disabled={selected.size === 0}
                    loading={bulkUpdateMut.isPending}
                    onClick={() => bulkUpdateMut.mutate({ ids: [...selected], status: bulkStatus })}
                  >
                    Apply
                  </Button>
                </>
              )}
              <button onClick={() => setBulkAction(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </>
      ) : (
        <Header
          title="My Products"
          actions={
            <div className="flex items-center gap-2">
              {products && products.length > 0 && (
                <button
                  type="button"
                  onClick={() => enterSelectMode()}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
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
        {(!userId || isLoading) && !products ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-gray-200 h-24 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-red-800">Couldn’t load your products</p>
            <p className="mt-2 text-xs text-red-600/90">{apiErrorMessage(productsError, 'Something went wrong')}</p>
            <button
              type="button"
              onClick={() => void refetchProducts()}
              className="mt-4 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white active:bg-red-800"
            >
              Retry
            </button>
          </div>
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
              const imgCount = product.images?.length ?? 0;
              const galleryUrls = productGalleryUrls(product.images);
              const canOpenGallery = !selectMode && galleryUrls.length > 0;
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
                  <div
                    className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/80 ${
                      canOpenGallery ? 'cursor-zoom-in' : ''
                    }`}
                    role={canOpenGallery ? 'button' : undefined}
                    tabIndex={canOpenGallery ? 0 : undefined}
                    aria-label={canOpenGallery ? 'View product photos' : undefined}
                    onClick={
                      canOpenGallery
                        ? (e) => {
                            e.stopPropagation();
                            setGallery({ urls: galleryUrls, initialIndex: 0 });
                          }
                        : undefined
                    }
                    onKeyDown={
                      canOpenGallery
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setGallery({ urls: galleryUrls, initialIndex: 0 });
                            }
                          }
                        : undefined
                    }
                  >
                    {(product.images ?? [])[0] ? (
                      <img src={mediaUrl(product.images[0])} alt="" className="h-full w-full object-cover pointer-events-none" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-gray-400">—</div>
                    )}
                    <span className="pointer-events-none absolute bottom-0.5 right-0.5 min-w-[1.125rem] rounded bg-black/60 px-1 text-center text-[9px] font-bold text-white leading-tight">
                      {imgCount}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{product.name}</h3>
                    {product.brand && (
                      <p className="truncate text-xs font-medium text-primary-600">{product.brand.name}</p>
                    )}
                    {product.category && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        <span className="text-gray-400">Category</span> · {product.category.name}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-gray-900 tabular-nums">
                        {formatPrice(product.price, product.priceMax)}
                      </span>
                      <span className="text-gray-300 select-none" aria-hidden>
                        ·
                      </span>
                      <span className="text-gray-600">
                        MOQ{' '}
                        <span className="font-semibold text-gray-900 tabular-nums">{product.moq}</span>
                        <span className="text-gray-500"> pcs</span>
                      </span>
                      <span className="text-gray-300 select-none" aria-hidden>
                        ·
                      </span>
                      <Badge
                        className={
                          product.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'ARCHIVED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {product.status === 'ACTIVE'
                          ? 'Live'
                          : product.status === 'DRAFT'
                            ? 'Draft'
                            : product.status === 'ARCHIVED'
                              ? 'Archived'
                              : product.status}
                      </Badge>
                    </div>
                  </div>
                  {!selectMode && (
                    <div
                      className="flex w-[7.25rem] shrink-0 flex-col gap-1 self-start"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Add photos"
                        aria-label="Add photos"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAddPhotos(product.id);
                        }}
                        disabled={uploadingProductId === product.id}
                        className="flex h-9 w-full shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200/80 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-60"
                      >
                        {uploadingProductId === product.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                        ) : (
                          <Camera className="h-4 w-4 shrink-0 text-gray-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Edit price, MOQ, and details"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vendor/products/${product.id}/edit`);
                        }}
                        className="flex w-full items-center justify-center gap-1 rounded-full bg-gray-100 px-1.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-gray-900 ring-1 ring-gray-200/80 active:bg-gray-200"
                      >
                        <Edit2 className="h-3 w-3 shrink-0 text-gray-600" />
                        <span>Edit</span>
                      </button>
                      {(product.images?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          title="Clears every extra photo and keeps only the cover. The cover is the first image; this does not delete the product."
                          aria-label="Clear extra photos, keep cover image only"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearImages(product.id);
                          }}
                          disabled={uploadingProductId === product.id}
                          className="flex w-full items-center justify-center gap-1 rounded-full bg-orange-50 px-1.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-orange-900 ring-1 ring-orange-200/90 active:bg-orange-100 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <ImageMinus className="h-3 w-3 shrink-0 text-orange-700" />
                          <span>Clear</span>
                        </button>
                      )}
                      <button
                        type="button"
                        title="Delete this product permanently"
                        aria-label="Delete product"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this product?')) deleteMut.mutate(product.id);
                        }}
                        className="flex w-full items-center justify-center gap-1 rounded-full bg-red-50 px-1.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-red-800 ring-1 ring-red-200/90 active:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3 shrink-0 text-red-700" />
                        <span className="truncate">Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ImageViewerLightbox
        open={gallery !== null}
        onClose={() => setGallery(null)}
        urls={gallery?.urls ?? []}
        initialIndex={gallery?.initialIndex ?? 0}
      />
    </>
  );
}
