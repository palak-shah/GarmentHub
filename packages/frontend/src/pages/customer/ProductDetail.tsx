import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, ShoppingCart, Store, Layers, Palette, Ruler, Tag } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { useCartStore } from '@/store/cartStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatters';
import { mediaUrl } from '@/utils/mediaUrl';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [quantity, setQuantity] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    setActiveImage(0);
  }, [id]);

  useEffect(() => {
    const len = product?.images?.length ?? 0;
    if (!product || len <= 1) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      const last = len - 1;
      if (e.key === 'ArrowLeft') setActiveImage((i) => Math.max(0, i - 1));
      else setActiveImage((i) => Math.min(last, i + 1));
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product?.id, product?.images?.length]);

  if (isLoading) return <PageSpinner />;
  if (!product) return null;

  const images = product.images ?? [];
  const qty = parseInt(quantity) || 0;

  const handleAddToCart = () => {
    if (qty < product.moq) {
      toast.error(`Minimum order quantity is ${product.moq}`);
      return;
    }
    addItem(product, qty);
    toast.success('Added to cart');
    setQuantity('');
  };

  return (
    <>
      <Header title={product.name} showBack />
      <div className="mx-auto max-w-4xl">
        {/* Image gallery */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {images[activeImage] ? (
            <img
              src={mediaUrl(images[activeImage])}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No image</div>
          )}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImage((i) => Math.max(0, i - 1))}
                disabled={activeImage <= 0}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2.5 text-white shadow-sm hover:bg-black/60 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImage((i) => Math.min(images.length - 1, i + 1))}
                disabled={activeImage >= images.length - 1}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2.5 text-white shadow-sm hover:bg-black/60 disabled:pointer-events-none disabled:opacity-30"
                aria-label="Next image"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
              <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-medium tabular-nums text-white">
                {activeImage + 1} / {images.length}
              </div>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? 'border-primary-600' : 'border-transparent'}`}
              >
                <img src={mediaUrl(img)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="px-4 py-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            <p className="mt-1 text-2xl font-bold text-primary-600">{formatPrice(product.price)}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Store className="h-4 w-4" />
            <span>{product.vendor?.businessName || product.vendor?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {product.brand && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                <Tag className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Brand</div>
                  <div className="font-medium">{product.brand.name}</div>
                </div>
              </div>
            )}
            {product.category && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                <Layers className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Category</div>
                  <div className="font-medium">{product.category.name}</div>
                </div>
              </div>
            )}
            {product.displayAttributes && product.displayAttributes.length > 0
              ? product.displayAttributes.map((row, i) => (
                  <div
                    key={`${row.label}-${row.value}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm"
                  >
                    <Layers className="h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">{row.label}</div>
                      <div className="font-medium">{row.value}</div>
                    </div>
                  </div>
                ))
              : (
                <>
                  {product.fabric && (
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Fabric</div>
                        <div className="font-medium">{product.fabric}</div>
                      </div>
                    </div>
                  )}
                  {product.pattern && (
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                      <Layers className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Pattern</div>
                        <div className="font-medium">{product.pattern}</div>
                      </div>
                    </div>
                  )}
                  {product.color && (
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                      <Palette className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Color</div>
                        <div className="font-medium">{product.color}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>

          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            Minimum Order Quantity: <strong>{product.moq} units</strong>
          </div>

          {/* Add to cart */}
          <div className="flex gap-3">
            <input
              type="number"
              placeholder={`Qty (min ${product.moq})`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={product.moq}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <Button onClick={handleAddToCart} disabled={qty < 1} className="flex-1">
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
