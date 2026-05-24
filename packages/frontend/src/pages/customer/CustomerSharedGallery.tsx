import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';

import { curationApi } from '@/api/curation.api';
import { useAuthStore } from '@/store/authStore';
import { mediaUrl, thumbUrl } from '@/utils/mediaUrl';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';
import { apiErrorMessage } from '@/utils/apiError';
import type { ShareOrderContext } from '@/store/selectionStore';

export type CustomerSharedGalleryLocationState = {
  shareOrderContext?: ShareOrderContext | null;
};

function formatAlbumDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function CustomerSharedGallery() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  const isBuyer = role === 'CUSTOMER';
  const state = location.state as CustomerSharedGalleryLocationState | null;
  const shareOrderFromNav = state?.shareOrderContext ?? null;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!productId) navigate('/', { replace: true });
  }, [productId, navigate]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['customer-shared-photos', productId],
    queryFn: () => curationApi.getSharedPhotosForProduct(productId!),
    enabled: !!productId && isBuyer,
  });

  const photos = useMemo(() => [...(data?.photos ?? [])].sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime()), [data?.photos]);

  const primaryPhoto = photos[0];
  const albumDate = primaryPhoto ? formatAlbumDate(primaryPhoto.sharedAt) : '';
  const traderName =
    primaryPhoto?.trader?.businessName || primaryPhoto?.trader?.name || '';
  const orderMode =
    primaryPhoto?.orderMode ?? shareOrderFromNav?.orderMode ?? 'DIRECT';
  const traderId = primaryPhoto?.traderId ?? shareOrderFromNav?.traderId ?? null;

  const toggle = (imageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const selectAll = () => {
    if (!photos.length) return;
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((p) => p.id)));
  };

  const handleOrder = () => {
    if (!productId || !data?.product || selected.size === 0) return;

    const lines = [...selected].map((productImageId) => ({
      productId,
      productImageId,
      quantity: data.product.moq,
    }));

    navigate('/bulk-order', {
      state: {
        orderDraft: {
          traderId: traderId ?? undefined,
          orderMode,
          lines,
        },
      },
    });
  };

  if (!productId) return null;

  if (!isBuyer) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2.5 text-gray-700 active:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-900">Shared photos</span>
        </header>
        <div className="flex-1 px-6 pt-12 text-center">
          <p className="text-sm font-medium text-gray-900">Buyer accounts only</p>
          <p className="mt-2 text-sm text-gray-600">
            Photos your traders shared with you are visible when you sign in with a <span className="font-medium">buyer</span>{' '}
            account. Switch profile or open this link from the customer app.
          </p>
        </div>
      </div>
    );
  }

  if (isPending) return <PageSpinner />;
  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2.5 text-gray-700 active:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-900">Photos</span>
        </header>
        <p className="flex-1 px-6 pt-16 text-center text-sm text-gray-600">{apiErrorMessage(error, 'Could not load shared photos.')}</p>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f7f9]">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2.5 text-gray-700 active:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-900 truncate">{data.product.name}</span>
        </header>
        <p className="px-6 pt-12 text-center text-sm text-gray-600">
          No pinned photos linked to curated shares yet. Open the product detail to browse the catalog gallery.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200/90 bg-white/95 backdrop-blur-sm px-2 py-1">
        <button type="button" onClick={() => navigate(-1)} className="rounded-full p-2.5 text-gray-700 active:bg-gray-100" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1" />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={selectAll}
            className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {selected.size === photos.length ? 'Clear selection' : 'Select all'}
          </button>
        )}
      </header>

      <div className="border-b border-gray-200 bg-white px-4 pb-4 pt-2">
        <h1 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">{data.product.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-gray-600">
          {albumDate ? <span>{albumDate}</span> : null}
          {albumDate && traderName ? <span className="text-gray-300">·</span> : null}
          {traderName ? (
            <span className="text-gray-600">
              Shared by <span className="font-medium text-gray-900">{traderName}</span>
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Shared photos · Tap to choose which ones to include in your order
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-3 sm:grid-cols-4 md:gap-2">
        {photos.map((photo, index) => {
          const on = selected.has(photo.id);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => toggle(photo.id)}
              className={`relative aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.98] ${
                on ? 'ring-2 ring-primary-500 shadow-md' : ''
              }`}
            >
              <img
                src={thumbUrl(photo.url)}
                alt=""
                className="h-full w-full object-cover"
                loading={index < 20 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.src.includes('/uploads/')) return;
                  el.src = mediaUrl(photo.url);
                }}
              />
              <div
                className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md transition-colors ${
                  on ? 'border-2 border-white bg-primary-600' : 'border-2 border-white/90 bg-black/25'
                }`}
                aria-hidden
              >
                {on ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 pb-1.5 pt-6">
                <p className="truncate text-center text-[10px] font-medium text-white drop-shadow">{formatDate(photo.sharedAt)}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={handleOrder}
          className="w-full rounded-full bg-primary-600 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-40"
        >
          {selected.size === 0 ? 'Select photos to order' : `Continue (${selected.size} photo${selected.size === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  );
}
