import { useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { mediaUrl, thumbUrl } from '@/utils/mediaUrl';
import { formatPrice, formatDate } from '@/utils/formatters';
import { useSelectionStore, type ShareOrderContext } from '@/store/selectionStore';
import { useLongPress } from '@/hooks/useLongPress';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onVisible?: (id: string) => void;
  onHidden?: (id: string) => void;
  sharedBy?: string;
  /** Trader Shared tab: recipients the product was sent to (Instagram-style pill). */
  sharedWithLabel?: string;
  /** When set, shows last-updated date (e.g. trader Recent tab). */
  showUpdatedAt?: boolean;
  /** Curated share context for checkout (order mode + trader). */
  shareOrderContext?: ShareOrderContext;
}

export function ProductCard({
  product,
  onVisible,
  onHidden,
  sharedBy,
  sharedWithLabel,
  showUpdatedAt,
  shareOrderContext,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { isSelecting, selectedIds, enterSelectionMode, toggleItem } = useSelectionStore();
  const isSelected = selectedIds.has(product.id);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !onVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(product.id);
        else onHidden?.(product.id);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.id, onVisible, onHidden]);

  const onLongPress = useCallback(() => {
    enterSelectionMode(product.id, shareOrderContext);
  }, [product.id, enterSelectionMode, shareOrderContext]);

  const longPress = useLongPress(onLongPress);

  const handleClick = () => {
    if (longPress.didFire()) return;
    if (isSelecting) {
      toggleItem(product.id);
    } else {
      navigate(`/products/${product.id}`, {
        state: shareOrderContext
          ? {
              shareContext: shareOrderContext,
              ...(product.traderOfferUnitPrice != null
                ? { traderOfferUnitPrice: product.traderOfferUnitPrice }
                : {}),
            }
          : undefined,
      });
    }
  };

  const img = (product.images ?? [])[0];
  const traderOffer = product.traderOfferUnitPrice;
  const listLabel = formatPrice(product.price, product.priceMax);
  const priceLabel = traderOffer != null ? formatPrice(traderOffer) : listLabel;

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      {...longPress}
      className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl bg-gray-100 select-none ${
        isSelected ? 'ring-3 ring-primary-500' : ''
      }`}
    >
      {/* Skeleton placeholder until image loads */}
      {img && !imgLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      {img ? (
        <img
          src={thumbUrl(img)}
          alt=""
          className={`h-full w-full object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes('/thumbs/')) {
              target.src = mediaUrl(img);
            }
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          No image
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-10">
        <p className="text-[15px] font-bold text-white leading-tight">{priceLabel}</p>
        {traderOffer != null && (
          <p className="text-[11px] font-semibold text-emerald-200/95 leading-tight">Trader offer / unit</p>
        )}
        {traderOffer != null && product.price != null && Math.abs(traderOffer - product.price) > 1e-6 && (
          <p className="text-[10px] text-white/65 line-through leading-tight">List {listLabel}</p>
        )}
        <p className="mt-0.5 text-[11px] text-white/70 leading-tight truncate">
          {[product.name, product.category?.name].filter(Boolean).join(' · ') || `Min ${product.moq} pcs`}
        </p>
        {showUpdatedAt && product.updatedAt && (
          <p className="mt-0.5 text-[10px] text-white/55 leading-tight">
            Updated {formatDate(product.updatedAt)}
          </p>
        )}
      </div>

      {!isSelecting && (sharedWithLabel || sharedBy) && (
        <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5">
          <p className="text-[9px] font-semibold text-white/90 truncate">
            {sharedWithLabel ? (
              <>
                <span className="text-white/70">To · </span>
                {sharedWithLabel}
              </>
            ) : (
              sharedBy
            )}
          </p>
        </div>
      )}

      {isSelecting && !isSelected && (
        <div className="pointer-events-none absolute inset-0 bg-white/20" />
      )}

      {isSelecting && (
        <div
          className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            isSelected
              ? 'border-primary-600 bg-primary-600'
              : 'border-white/80 bg-black/30'
          }`}
        >
          {isSelected && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
        </div>
      )}
    </div>
  );
}
