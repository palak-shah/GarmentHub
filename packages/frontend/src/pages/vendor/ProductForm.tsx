import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImagePlus, Star, X } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { brandApi } from '@/api/brand.api';
import { vendorApi } from '@/api/vendor.api';
import { uploadApi } from '@/api/upload.api';
import { Header } from '@/components/layout/Header';
import { ImageViewerLightbox } from '@/components/ui/ImageViewerLightbox';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Combobox, StringCombobox } from '@/components/ui/Combobox';
import type { FilterOptions, VendorCatalogCategory } from '@/types';
import { mediaUrl } from '@/utils/mediaUrl';
import { useAuthStore } from '@/store/authStore';

/** Last server version we hydrated from per product (survives Strict Mode remounts). */
const lastHydratedServerVersion = new Map<string, string>();

function suggestionsForLabel(label: string, filters: FilterOptions | undefined): string[] {
  if (!filters) return [];
  const n = label.toLowerCase();
  if (n.includes('fabric')) return filters.fabrics;
  if (n.includes('pattern')) return filters.patterns;
  if (n.includes('color') || n.includes('colour')) return filters.colors;
  return [];
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const [form, setForm] = useState({
    name: '', brandId: '', categoryId: '', pattern: '', fabric: '', color: '',
    price: '', moq: '1', status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadBatchCount, setUploadBatchCount] = useState(0);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id, userId],
    queryFn: () => productApi.getById(id!),
    enabled: isEdit && !!id && !!userId,
  });

  const { data: catalogCategories } = useQuery({
    queryKey: ['vendor-product-categories', userId],
    queryFn: () => vendorApi.getCatalogCategories(),
    enabled: !!userId,
  });

  const { data: filters } = useQuery({
    queryKey: ['product-filters'],
    queryFn: () => productApi.getFilters(),
  });

  const { data: brands } = useQuery({
    queryKey: ['vendor-brands', userId],
    queryFn: () => brandApi.listMy(),
    enabled: !!userId,
  });

  const selectedCategoryRow: VendorCatalogCategory | undefined = useMemo(
    () => catalogCategories?.find((c) => c.id === form.categoryId),
    [catalogCategories, form.categoryId],
  );

  const mergedAttributes = useMemo(() => {
    if (!selectedCategoryRow) return [];
    return [...selectedCategoryRow.defaultAttributes, ...selectedCategoryRow.vendorAttributes].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  }, [selectedCategoryRow]);

  const useDynamicAttrs = mergedAttributes.length > 0;

  useEffect(() => {
    return () => {
      if (id) lastHydratedServerVersion.delete(id);
    };
  }, [id]);

  useEffect(() => {
    if (!product || !isEdit) return;
    const serverKey = `${product.updatedAt?.toString() ?? ''}`;
    if (lastHydratedServerVersion.get(product.id) === serverKey) return;
    lastHydratedServerVersion.set(product.id, serverKey);

    setForm({
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      pattern: product.pattern || '',
      fabric: product.fabric || '',
      color: product.color || '',
      price: product.price?.toString() || '',
      moq: product.moq.toString(),
      status: product.status === 'ARCHIVED' ? 'DRAFT' : product.status,
    });
    setImageUrls(Array.isArray(product.images) ? [...product.images] : []);
    setAttrValues(
      product.attributeValues && typeof product.attributeValues === 'object'
        ? { ...product.attributeValues }
        : {},
    );
  }, [product, isEdit]);

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => productApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Product created');
      navigate('/vendor/products');
    },
    onError: () => toast.error('Failed to create product'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => productApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Product updated');
      navigate('/vendor/products');
    },
    onError: () => toast.error('Failed to update product'),
  });

  const makeMainAt = (index: number) => {
    setImageUrls((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [u] = next.splice(index, 1);
      return [u, ...next];
    });
  };

  const removeImageAt = (index: number) => {
    setImageUrls((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const confirmRemoveImageAt = (index: number) => {
    if (!confirm('Remove this photo from the product?')) return;
    removeImageAt(index);
  };

  const openPhotoViewer = (index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerOpen(true);
  };

  const renderAlbumTile = (index: number, className: string, plusOverlay?: number) => {
    const url = imageUrls[index];
    if (url == null) return null;
    return (
      <div key={`album-${index}-${url}`} className={`relative min-h-0 bg-gray-100 ${className}`}>
        <img src={mediaUrl(url)} alt="" className="pointer-events-none h-full w-full object-cover" />
        {plusOverlay != null && plusOverlay > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/45"
            aria-hidden
          >
            <span className="text-lg font-semibold text-white">+{plusOverlay}</span>
          </div>
        )}
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in border-0 bg-transparent p-0"
          onClick={() => openPhotoViewer(index)}
          aria-label={`View photo ${index + 1} full size`}
        />
        {index === 0 ? (
          <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Main
          </span>
        ) : (
          <button
            type="button"
            className="absolute bottom-1 left-1 z-20 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              makeMainAt(index);
            }}
            aria-label="Make main photo"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          className="absolute right-1 top-1 z-20 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            confirmRemoveImageAt(index);
          }}
          aria-label="Remove photo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const handleSubmit = () => {
    if (!form.name || !form.brandId || !form.categoryId) {
      toast.error('Name, brand, and category are required');
      return;
    }

    const base: Record<string, unknown> = {
      name: form.name,
      brandId: form.brandId,
      categoryId: form.categoryId,
      price: form.price ? parseFloat(form.price) : undefined,
      moq: parseInt(form.moq) || 1,
      status: form.status,
      images: imageUrls,
    };

    if (useDynamicAttrs) {
      const attributeValues: Record<string, string> = {};
      for (const [k, v] of Object.entries(attrValues)) {
        if (v && v.trim()) attributeValues[k] = v.trim();
      }
      base.attributeValues = attributeValues;
      base.pattern = '';
      base.fabric = '';
      base.color = '';
    } else {
      base.pattern = form.pattern;
      base.fabric = form.fabric;
      base.color = form.color;
    }

    if (isEdit) updateMut.mutate(base);
    else createMut.mutate(base);
  };

  if (!userId || (isEdit && loadingProduct)) {
    return (
      <>
        <Header title={isEdit ? 'Edit Product' : 'Add Product'} showBack />
        <PageSpinner />
      </>
    );
  }

  const isPending = createMut.isPending || updateMut.isPending;

  const categoryOptions =
    catalogCategories?.map((c) => ({ value: c.id, label: c.name })) ?? [];

  return (
    <>
      <Header title={isEdit ? 'Edit Product' : 'Add Product'} showBack />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Brand</label>
          <select
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select brand</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {brands && brands.length === 0 && (
            <p className="text-xs text-amber-600">No brands yet. Create one in the Brands section first.</p>
          )}
        </div>

        <Combobox
          label="Category"
          value={form.categoryId}
          onChange={(newId) => {
            setForm((prev) => {
              if (prev.categoryId !== newId) setAttrValues({});
              return { ...prev, categoryId: newId };
            });
          }}
          options={categoryOptions}
          placeholder="Search categories…"
        />

        {useDynamicAttrs ? (
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <p className="text-xs font-medium text-gray-600">Attributes for this category</p>
            {mergedAttributes.map((a) => (
              <StringCombobox
                key={a.id}
                label={a.name}
                value={attrValues[a.id] ?? ''}
                onChange={(v) => setAttrValues((prev) => ({ ...prev, [a.id]: v }))}
                suggestions={suggestionsForLabel(a.name, filters)}
                placeholder={`Enter ${a.name.toLowerCase()}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fabric" value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })} placeholder="e.g. Cotton" />
            <Input label="Pattern" value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} placeholder="e.g. Solid" />
            <Input label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. White" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Optional" />
          <Input label="MOQ" type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'DRAFT' })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
            <p className="text-xs text-gray-500">
              Draft products are hidden from buyer Search and the home catalog. Use Active when buyers should see this product.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-gray-700">Photos</label>
            <span className="text-xs text-gray-500">
              {uploadingImages && uploadBatchCount > 0
                ? `${imageUrls.length} on form · uploading ${uploadBatchCount}…`
                : `${imageUrls.length} ${imageUrls.length === 1 ? 'photo' : 'photos'}`}
            </span>
          </div>

          <input
            id="product-gallery-files"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-label="Choose product photos"
            onChange={async (e) => {
              const input = e.target;
              // Copy files before resetting the input: FileList is live; clearing value empties it.
              const files = input.files?.length ? Array.from(input.files) : [];
              input.value = '';
              if (!files.length) return;
              setUploadBatchCount(files.length);
              setUploadingImages(true);
              try {
                const { urls } = await uploadApi.postProductImages(files);
                if (urls.length === 0) {
                  toast.error('No images were saved. Check that the API is running and you are logged in as a vendor.');
                  return;
                }
                setImageUrls((prev) => [...prev, ...urls]);
                toast.success(urls.length === 1 ? 'Photo added' : `${urls.length} photos added`);
              } catch (e) {
                console.error(e);
                toast.error(e instanceof Error ? e.message : 'Could not upload photos');
              } finally {
                setUploadingImages(false);
                setUploadBatchCount(0);
              }
            }}
          />

          <label
            htmlFor={uploadingImages ? undefined : 'product-gallery-files'}
            className={`inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gray-100 text-base font-medium text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
              uploadingImages ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          >
            {uploadingImages && (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <ImagePlus className="h-5 w-5 shrink-0" />
            {uploadingImages ? 'Uploading…' : 'Add photos from gallery'}
          </label>

          {imageUrls.length > 0 && (
            <div className="space-y-2">
              {imageUrls.length >= 4 ? (
                <div className="mx-auto w-full max-w-[17.5rem] rounded-2xl bg-gray-200 p-0.5 ring-1 ring-gray-200/80">
                  <div className="overflow-hidden rounded-[14px]">
                    <div className="grid grid-cols-2 gap-0.5">
                      {renderAlbumTile(0, 'aspect-square min-h-0')}
                      {renderAlbumTile(1, 'aspect-square min-h-0')}
                      {renderAlbumTile(2, 'aspect-square min-h-0')}
                      {renderAlbumTile(
                        3,
                        'aspect-square min-h-0',
                        imageUrls.length > 4 ? imageUrls.length - 4 : undefined,
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[17.5rem] rounded-2xl bg-gray-200 p-0.5 ring-1 ring-gray-200/80">
                  {imageUrls.length === 1 && (
                    <div className="overflow-hidden rounded-[14px]">
                      {renderAlbumTile(0, 'aspect-[4/3] w-full')}
                    </div>
                  )}

                  {imageUrls.length === 2 && (
                    <div className="overflow-hidden rounded-[14px]">
                      <div className="grid grid-cols-2 gap-0.5">
                        {renderAlbumTile(0, 'aspect-square min-h-0')}
                        {renderAlbumTile(1, 'aspect-square min-h-0')}
                      </div>
                    </div>
                  )}

                  {imageUrls.length === 3 && (
                    <div className="overflow-hidden rounded-[14px]">
                      <div className="grid h-56 grid-cols-2 grid-rows-2 gap-0.5">
                        {renderAlbumTile(0, 'row-span-2 h-full min-h-0')}
                        {renderAlbumTile(1, 'min-h-0')}
                        {renderAlbumTile(2, 'min-h-0')}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-xs text-gray-500">
                With 4+ photos you get a chat-style 2×2; +N means more in the gallery. Tap any tile to open all—swipe,
                set cover, or delete there too.
              </p>
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={handleSubmit} loading={isPending}>
          {isEdit ? 'Update Product' : 'Create Product'}
        </Button>
      </div>

      <ImageViewerLightbox
        open={photoViewerOpen}
        onClose={() => setPhotoViewerOpen(false)}
        urls={imageUrls}
        initialIndex={photoViewerIndex}
        manageActions={{
          onMakeMain: (i) => makeMainAt(i),
          onRemove: (i) => confirmRemoveImageAt(i),
        }}
      />
    </>
  );
}
