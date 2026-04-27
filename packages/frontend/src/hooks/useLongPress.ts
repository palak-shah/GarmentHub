import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 400;

export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      fired.current = false;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [onLongPress],
  );

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    didFire: () => fired.current,
  };
}
