import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Send, ShoppingBag, ZoomIn, X, Users, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi } from '@/api/product.api';
import { workflowApi } from '@/api/workflow.api';
import { useAuthStore } from '@/store/authStore';
import { useSelectionStore } from '@/store/selectionStore';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatters';
import { mediaUrl, thumbUrl } from '@/utils/mediaUrl';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const locState = location.state as {
    sharedBy?: { id: string; name: string; businessName?: string };
    shareContext?: { traderId: string; orderMode: 'DIRECT' | 'MANAGED' };
    traderOfferUnitPrice?: number | null;
  } | null;
  const sharedBy = locState?.sharedBy;
  const shareContext = locState?.shareContext;
  const traderOfferUnitPrice = locState?.traderOfferUnitPrice;
  const [activeImage, setActiveImage] = useState(0);
  const [hiResLoaded, setHiResLoaded] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const enterSelectionMode = useSelectionStore((s) => s.enterSelectionMode);
  const role = useAuthStore((s) => s.user?.role);
  const isCustomer = role === 'CUSTOMER';
  const isTrader = role === 'TRADER';
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (id) workflowApi.markState(id, 'SEEN').catch(() => {});
  }, [id]);

  const saveMutation = useMutation({
    mutationFn: () => productApi.saveProduct(id!),
    onSuccess: () => {
      setSaved(true);
      toast.success('Saved');
      queryClient.invalidateQueries({ queryKey: ['saved-products'] });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      await workflowApi.markBulk([id!], 'SKIPPED');
    },
    onSuccess: () => {
      toast.success('Skipped');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-unseen'] });
      navigate(-1);
    },
    onError: () => toast.error('Skip failed'),
  });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current || !product) return;
      const dx = e.clientX - pointerStart.current.x;
      const dy = Math.abs(e.clientY - pointerStart.current.y);
      pointerStart.current = null;

      // Double-tap to zoom
      const now = Date.now();
      if (now - lastTap.current < 300 && Math.abs(dx) < 10 && dy < 10) {
        setZoomed(true);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;

      if (dy > 40) return;
      const len = product.images?.length ?? 0;
      if (dx < -50 && activeImage < len - 1) setActiveImage((i) => i + 1);
      else if (dx > 50 && activeImage > 0) setActiveImage((i) => i - 1);
    },
    [activeImage, product],
  );

  if (isLoading) return <PageSpinner />;
  if (!product) return null;

  const images = product.images ?? [];
  const sellerName = product.vendor?.businessName || product.vendor?.name || '';
  const sellerInitial = sellerName ? sellerName.charAt(0).toUpperCase() : '?';
  const traderName = sharedBy?.businessName || sharedBy?.name || product.trader?.businessName || product.trader?.name;

  const handleOrder = () => {
    enterSelectionMode(product.id, shareContext);
    navigate('/bulk-order');
  };

  const handleWhatsApp = () => {
    const phone = product.vendor?.phone;
    if (phone) window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleShare = async () => {
    const text = `${product.name || 'Product'} – ${formatPrice(product.price, product.priceMax)} on GarmentHub`;
    if (navigator.share) {
      try { await navigator.share({ title: 'GarmentHub', text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied!');
    }
  };

  const goToCuratedShare = () => {
    enterSelectionMode(product.id);
    navigate('/trader/share');
  };

  const detailParts = [
    product.fabric,
    product.color,
    product.pattern,
    product.brand?.name,
    product.category?.name,
  ].filter(Boolean);

  return (
    <div className={`min-h-screen bg-white ${isTrader ? 'pb-32' : 'pb-20'}`}>
      {/* ── Seller row (like Instagram post header) ── */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-4xl flex items-center gap-3 px-4 py-2.5">
        <button onClick={() => navigate(-1)} className="mr-1 active:opacity-60">
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 text-xs font-bold text-white">
          {sellerInitial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{sellerName || 'Seller'}</p>
          {traderName && (
            <p className="text-[10px] text-gray-400 truncate">Shared by {traderName}</p>
          )}
        </div>
        <button onClick={handleWhatsApp} className="active:opacity-60">
          <svg viewBox="0 0 24 24" fill="#25D366" className="h-5 w-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.108-1.138l-.292-.174-3.064.91.91-3.064-.174-.292A7.96 7.96 0 014 12a8 8 0 1116 0 8 8 0 01-8 8z" />
          </svg>
        </button>
      </div>
      </div>

      {/* ── Image (like an Instagram post) ── */}
      <div
        className="relative aspect-square w-full bg-gray-50 touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {images[activeImage] ? (
          <>
            {!hiResLoaded[activeImage] && (
              <img
                src={thumbUrl(images[activeImage])}
                alt=""
                className="absolute inset-0 h-full w-full object-cover blur-[2px]"
                draggable={false}
              />
            )}
            <img
              key={activeImage}
              src={mediaUrl(images[activeImage])}
              alt=""
              className={`h-full w-full object-cover transition-opacity duration-200 ${hiResLoaded[activeImage] ? 'opacity-100' : 'opacity-0'}`}
              draggable={false}
              fetchPriority="high"
              onLoad={() => setHiResLoaded((prev) => ({ ...prev, [activeImage]: true }))}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">No image</div>
        )}

        {/* Zoom button */}
        {images[activeImage] && (
          <button
            onClick={() => setZoomed(true)}
            className="absolute right-3 bottom-8 z-10 rounded-full bg-black/40 p-2 text-white active:bg-black/60"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        )}

        {/* Dots (Instagram style) */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === activeImage ? 'h-1.5 w-1.5 bg-primary-500' : 'h-1.5 w-1.5 bg-gray-400/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full-screen zoom overlay */}
      {zoomed && images[activeImage] && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setZoomed(false)}>
          <button className="absolute top-4 right-4 z-50 rounded-full bg-white/20 p-2 text-white active:bg-white/40">
            <X className="h-5 w-5" />
          </button>
          <img
            src={mediaUrl(images[activeImage])}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>
      )}

      {/* ── Action row (buyers / vendors); traders use fixed bar below ── */}
      {!isTrader && (
        <div className="flex items-center px-3 py-2">
          {isCustomer && (
            <button onClick={handleOrder} className="p-2 active:opacity-60">
              <ShoppingBag className="h-6 w-6 text-gray-800" />
            </button>
          )}
          <button onClick={handleShare} className="p-2 active:opacity-60">
            <Send className="h-6 w-6 text-gray-800" />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="p-2 active:opacity-60"
          >
            <Bookmark className={`h-6 w-6 ${saved ? 'fill-gray-800 text-gray-800' : 'text-gray-800'}`} />
          </button>
        </div>
      )}

      {/* ── Info (like Instagram caption area) ── */}
      <div className="px-4 space-y-1.5">
        {traderOfferUnitPrice != null ? (
          <>
            <p className="text-xl font-extrabold text-emerald-800">{formatPrice(traderOfferUnitPrice)} / unit</p>
            <p className="text-xs font-medium text-gray-600">
              Trader offer · List {formatPrice(product.price, product.priceMax)}
            </p>
          </>
        ) : (
          <p className="text-xl font-extrabold text-gray-900">{formatPrice(product.price, product.priceMax)}</p>
        )}

        {product.name && (
          <p className="text-sm text-gray-800">
            <span className="font-semibold">{sellerName || 'Seller'}</span>{' '}
            {product.name}
          </p>
        )}

        {detailParts.length > 0 && (
          <p className="text-sm text-gray-500">{detailParts.join(' · ')}</p>
        )}

        <p className="text-xs text-gray-400">Min order {product.moq} pcs</p>
      </div>

      {/* ── Sticky Order button (buyers only) ── */}
      {isCustomer && (
        <div className="fixed bottom-0 inset-x-0 z-30 px-4 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom,0px))] bg-white border-t border-gray-100">
          <button
            onClick={handleOrder}
            className="mx-auto block w-full max-w-4xl h-11 rounded-lg bg-primary-600 text-sm font-bold text-white active:bg-primary-700"
          >
            Order ·{' '}
            {traderOfferUnitPrice != null ? formatPrice(traderOfferUnitPrice) : formatPrice(product.price, product.priceMax)}{' '}
            · Min {product.moq} pcs
          </button>
        </div>
      )}

      {isTrader && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[max(12px,env(safe-area-inset-bottom,0px))]">
          <div className="mx-auto max-w-4xl px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-2 py-3 text-xs font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
            >
              <EyeOff className="h-4 w-4 shrink-0" />
              Skip
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-2 py-3 text-xs font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
            >
              <Bookmark className="h-4 w-4 shrink-0" />
              Save
            </button>
            <button
              type="button"
              onClick={goToCuratedShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-primary-200 bg-primary-50 px-2 py-3 text-xs font-semibold text-primary-700 active:bg-primary-100 min-h-[52px]"
            >
              <Users className="h-4 w-4 shrink-0" />
              Share
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-2 py-3 text-xs font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
            >
              <Send className="h-4 w-4 shrink-0" />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
