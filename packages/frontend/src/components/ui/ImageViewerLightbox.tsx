import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Star, Trash2, X } from 'lucide-react';
import { mediaUrl } from '@/utils/mediaUrl';

type ImageViewerLightboxProps = {
  open: boolean;
  onClose: () => void;
  /** Stored paths (same as product `images`); `mediaUrl` applied inside. */
  urls: string[];
  initialIndex: number;
  /** When set (e.g. vendor product form), show cover + delete for the current photo. */
  manageActions?: {
    onMakeMain: (index: number) => void;
    onRemove: (index: number) => void;
  };
};

/**
 * Full-screen photo viewer (WhatsApp-style): dark backdrop, contain-fit image,
 * prev/next, swipe, thumbnail strip, Escape / arrow keys.
 */
export function ImageViewerLightbox({
  open,
  onClose,
  urls,
  initialIndex,
  manageActions,
}: ImageViewerLightboxProps) {
  const [idx, setIdx] = useState(0);
  const thumbRowRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open && urls.length > 0) {
      setIdx(Math.min(Math.max(0, initialIndex), urls.length - 1));
    }
  }, [open, initialIndex, urls.length]);

  useEffect(() => {
    setIdx((i) => {
      if (urls.length === 0) return 0;
      return Math.min(i, urls.length - 1);
    });
  }, [urls.length]);

  useEffect(() => {
    if (open && urls.length === 0) onClose();
  }, [open, urls.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(urls.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, urls.length]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIdx((i) => Math.min(urls.length - 1, i + 1)), [urls.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx > 70) goPrev();
    else if (dx < -70) goNext();
  };

  useEffect(() => {
    if (!open || !thumbRowRef.current) return;
    const row = thumbRowRef.current;
    const el = row.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [idx, open]);

  if (!open || urls.length === 0) return null;

  const src = mediaUrl(urls[idx]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="View photos"
    >
      <header
        className="relative flex shrink-0 items-center justify-center px-2 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-2 rounded-full p-2 text-white hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-7 w-7" />
        </button>
        <span className="text-sm font-medium tabular-nums text-white">
          {idx + 1} / {urls.length}
        </span>
      </header>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {idx > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-0 z-10 rounded-full bg-black/45 p-2.5 text-white hover:bg-black/65 sm:left-2"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>
        )}
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
        {idx < urls.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-0 z-10 rounded-full bg-black/45 p-2.5 text-white hover:bg-black/65 sm:right-2"
            aria-label="Next photo"
          >
            <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>
        )}
      </div>

      {manageActions && urls.length > 0 && (
        <div className="flex shrink-0 items-center justify-center gap-6 border-t border-white/10 px-4 py-2">
          <button
            type="button"
            disabled={idx <= 0}
            onClick={() => idx > 0 && manageActions.onMakeMain(idx)}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-white/90 enabled:hover:bg-white/10 disabled:opacity-35"
            aria-label="Set as cover image"
          >
            <Star className="h-6 w-6" />
            <span className="text-[10px] font-medium">Cover</span>
          </button>
          <button
            type="button"
            onClick={() => manageActions.onRemove(idx)}
            className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-red-300 hover:bg-white/10"
            aria-label="Remove photo"
          >
            <Trash2 className="h-6 w-6" />
            <span className="text-[10px] font-medium">Delete</span>
          </button>
        </div>
      )}

      <nav
        ref={thumbRowRef}
        className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="All photos"
      >
        {urls.map((u, i) => (
          <button
            key={`${i}-${u}`}
            type="button"
            onClick={() => setIdx(i)}
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg transition-opacity ${
              i === idx ? 'ring-2 ring-white ring-offset-2 ring-offset-black opacity-100' : 'opacity-55 hover:opacity-90'
            }`}
            aria-label={`Photo ${i + 1}`}
            aria-current={i === idx ? 'true' : undefined}
          >
            <img src={mediaUrl(u)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </nav>
    </div>,
    document.body,
  );
}
