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

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_PX = 70;

function touchDistance(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Full-screen photo viewer: dark backdrop, contain-fit image, prev/next, swipe,
 * thumbnail strip, pinch / Ctrl+wheel zoom, double-tap zoom, Escape / arrow keys.
 */
export function ImageViewerLightbox({
  open,
  onClose,
  urls,
  initialIndex,
  manageActions,
}: ImageViewerLightboxProps) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState({ scale: 1, tx: 0, ty: 0 });
  const thumbRowRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const panOrigin = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const gestureHadPinch = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const scaleRef = useRef(1);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    scaleRef.current = zoom.scale;
  }, [zoom.scale]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (open) lastTap.current = null;
  }, [open]);

  useEffect(() => {
    setZoom({ scale: 1, tx: 0, ty: 0 });
  }, [idx]);

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

  const clampScale = useCallback((s: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s)), []);

  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIdx((i) => Math.min(urls.length - 1, i + 1)), [urls.length]);

  useEffect(() => {
    const el = mainRef.current;
    if (!open || !el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.008;
      setZoom((z) => ({ ...z, scale: clampScale(z.scale + delta) }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, clampScale]);

  useEffect(() => {
    if (!open || !thumbRowRef.current) return;
    const row = thumbRowRef.current;
    const child = row.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [idx, open]);

  const onTouchStartMain = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartX.current = null;
      panOrigin.current = null;
      pinchStartDist.current = touchDistance(e.touches[0], e.touches[1]);
      pinchStartScale.current = scaleRef.current;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      if (scaleRef.current <= 1.01) {
        touchStartX.current = t.clientX;
        panOrigin.current = null;
      } else {
        touchStartX.current = null;
        panOrigin.current = {
          x: t.clientX,
          y: t.clientY,
          tx: zoomRef.current.tx,
          ty: zoomRef.current.ty,
        };
      }
    }
  };

  const onTouchMoveMain = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current != null && pinchStartDist.current > 10) {
      e.preventDefault();
      gestureHadPinch.current = true;
      const d = touchDistance(e.touches[0], e.touches[1]);
      const next = clampScale(pinchStartScale.current * (d / pinchStartDist.current));
      setZoom((z) => ({ ...z, scale: next }));
    } else if (e.touches.length === 1 && panOrigin.current && scaleRef.current > 1.01) {
      e.preventDefault();
      const t = e.touches[0];
      setZoom((z) => ({
        scale: z.scale,
        tx: panOrigin.current!.tx + (t.clientX - panOrigin.current!.x),
        ty: panOrigin.current!.ty + (t.clientY - panOrigin.current!.y),
      }));
    }
  };

  const onTouchEndMain = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      if (e.touches.length === 1 && pinchStartDist.current != null) {
        pinchStartDist.current = null;
      }
      return;
    }

    const ended = e.changedTouches[0];
    const now = Date.now();
    const lp = lastTap.current;

    if (
      !gestureHadPinch.current &&
      lp &&
      now - lp.t < 320 &&
      Math.hypot(ended.clientX - lp.x, ended.clientY - lp.y) < 48
    ) {
      lastTap.current = null;
      setZoom((z) =>
        z.scale <= 1.05
          ? { scale: DOUBLE_TAP_ZOOM, tx: 0, ty: 0 }
          : { scale: 1, tx: 0, ty: 0 },
      );
      pinchStartDist.current = null;
      touchStartX.current = null;
      panOrigin.current = null;
      gestureHadPinch.current = false;
      return;
    }
    lastTap.current = { t: now, x: ended.clientX, y: ended.clientY };

    if (!gestureHadPinch.current && scaleRef.current <= 1.01 && touchStartX.current != null) {
      const dx = ended.clientX - touchStartX.current;
      if (dx > SWIPE_PX) goPrev();
      else if (dx < -SWIPE_PX) goNext();
    }

    pinchStartDist.current = null;
    touchStartX.current = null;
    panOrigin.current = null;
    gestureHadPinch.current = false;
  };

  if (!open || urls.length === 0) return null;

  const src = mediaUrl(urls[idx]);
  const zoomed = zoom.scale > 1.02;

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
        ref={mainRef}
        className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 ${
          zoomed ? 'touch-none' : 'touch-pan-y'
        }`}
        onTouchStart={onTouchStartMain}
        onTouchMove={onTouchMoveMain}
        onTouchEnd={onTouchEndMain}
      >
        {idx > 0 && !zoomed && (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              goPrev();
            }}
            className="absolute left-0 z-10 rounded-full bg-black/45 p-2.5 text-white hover:bg-black/65 sm:left-2"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
          </button>
        )}
        <div
          className="flex max-h-full max-w-full items-center justify-center"
          style={{
            transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        </div>
        {idx < urls.length - 1 && !zoomed && (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
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
