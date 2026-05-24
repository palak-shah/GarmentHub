import { useState, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { useAuthStore } from '@/store/authStore';
import { mediaUrl, thumbUrl } from '@/utils/mediaUrl';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';
import { apiErrorMessage } from '@/utils/apiError';

import type { TraderGalleryShareLine } from '@/types';

/** Short date line similar to Google Photos album headers (e.g. “Apr 23, 2026”). */
function formatAlbumDate(createdAt: string | undefined) {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatImageDate(createdAt: string | undefined) {
  if (!createdAt) return '—';
  try {
    return formatDate(createdAt);
  } catch {
    return '—';
  }
}

function GalleryError({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
      <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-gray-200/80 bg-white px-2 py-2 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2.5 text-gray-700 active:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-gray-900">Photos</p>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28 text-center">
        <p className="text-base font-medium text-gray-900">Couldn’t load photos</p>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-primary-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function GallerySkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
      <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-gray-200/80 bg-white px-2 py-2 shadow-sm">
        <button type="button" onClick={onBack} className="rounded-full p-2.5 text-gray-700 active:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 space-y-2 py-1">
          <div className="h-6 w-3/4 max-w-xs animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-gray-100" />
        </div>
      </header>
      <div className="px-3 pt-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200/80" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TraderProductGallery() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isTrader = role === 'TRADER';

  const { data: galleryProduct, isPending, isError, error, refetch } = useQuery({
    queryKey: ['product-gallery', productId],
    queryFn: () => productApi.getTraderGallery(productId!),
    enabled: !!productId && isTrader,
    staleTime: 60_000,
  });

  const images = useMemo(() => {
    if (!galleryProduct?.imageAssets?.length) return [];
    return [...galleryProduct.imageAssets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [galleryProduct?.imageAssets]);

  /** Newest-first: first image = most recent upload (Google-style “album date”). */
  const albumDateLabel = images[0] ? formatAlbumDate(images[0].createdAt) : '';

  const toggle = (imageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const selectAll = () => {
    if (!images.length) return;
    if (selected.size === images.length) setSelected(new Set());
    else setSelected(new Set(images.map((i) => i.id)));
  };

  const handleShare = () => {
    if (!productId || selected.size === 0) return;
    const shareLines: TraderGalleryShareLine[] = [...selected].map((productImageId) => ({
      productId,
      productImageId,
    }));
    navigate('/trader/share', { state: { shareLines } });
  };

  if (!role) return <PageSpinner />;

  if (!isTrader)
    return productId ? (
      <Navigate to={`/products/${productId}`} replace />
    ) : (
      <Navigate to="/" replace />
    );

  if (!productId) {
    return <Navigate to="/" replace />;
  }

  if (isPending) return <GallerySkeleton onBack={() => navigate(-1)} />;

  if (isError) {
    return (
      <GalleryError
        message={apiErrorMessage(error, 'Check your connection and try again.')}
        onBack={() => navigate(-1)}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!galleryProduct) return <GallerySkeleton onBack={() => navigate(-1)} />;

  const vendorLine = galleryProduct.vendor?.businessName ?? galleryProduct.vendor?.name ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Narrow app bar — back + actions */}
      <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-gray-200/90 bg-white/95 px-1 py-1 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2.5 text-gray-700 active:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1" />
        {images.length > 1 && (
          <button
            type="button"
            onClick={selectAll}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          >
            {selected.size === images.length ? 'Clear selection' : 'Select all'}
          </button>
        )}
      </header>

      {/* Album-style hero — title + date + source (similar to google.com/photos sharing layout) */}
      <div className="border-b border-gray-200/80 bg-white px-4 pb-5 pt-2">
        <h1 className="text-[1.375rem] font-normal leading-snug tracking-tight text-gray-900 sm:text-2xl md:text-[1.75rem]">
          {galleryProduct.name}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-600">
          {albumDateLabel ? <span>{albumDateLabel}</span> : null}
          {albumDateLabel && vendorLine ? <span className="text-gray-300" aria-hidden>·</span> : null}
          {vendorLine ? (
            <span className="text-gray-500">
              From <span className="font-medium text-gray-700">{vendorLine}</span>
            </span>
          ) : null}
        </div>
        {images.length > 0 ? (
          <p className="mt-3 text-xs text-gray-400">{images.length} photo{images.length === 1 ? '' : 's'}</p>
        ) : null}
      </div>

      {!images.length ? (
        <p className="px-6 py-16 text-center text-sm text-gray-500">No photos yet for this product.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 p-3 sm:grid-cols-4 md:gap-2">
          {images.map((img, index) => {
            const isOn = selected.has(img.id);
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => toggle(img.id)}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-gray-200 shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98] ${
                  isOn ? 'ring-2 ring-primary-500 shadow-md' : ''
                }`}
              >
                <img
                  src={thumbUrl(img.url)}
                  alt=""
                  className="h-full w-full object-cover transition group-active:brightness-95"
                  loading={index < 24 ? 'eager' : 'lazy'}
                  decoding="async"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.src.includes('/uploads/')) return;
                    el.src = mediaUrl(img.url);
                  }}
                />
                {/* Google Photos–style selection affordance */}
                <div
                  className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-colors ${
                    isOn ? 'border-2 border-white bg-primary-600' : 'border-2 border-white/90 bg-black/25 backdrop-blur-[2px]'
                  }`}
                  aria-hidden
                >
                  {isOn ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 pb-1.5 pt-6">
                  <p className="truncate text-center text-[10px] font-medium text-white drop-shadow-sm">
                    {formatImageDate(img.createdAt)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/90 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={handleShare}
          className="w-full rounded-full bg-primary-600 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selected.size === 0 ? 'Select photos to share' : `Share ${selected.size} photo${selected.size === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
