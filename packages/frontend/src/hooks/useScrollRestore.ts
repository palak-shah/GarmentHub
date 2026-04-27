import { useEffect, useRef } from 'react';

const scrollPositions = new Map<string, number>();

export function useScrollRestore(key: string) {
  const restored = useRef(false);

  useEffect(() => {
    if (!restored.current) {
      const saved = scrollPositions.get(key);
      if (saved && saved > 0) {
        requestAnimationFrame(() => window.scrollTo(0, saved));
      }
      restored.current = true;
    }

    const save = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      window.removeEventListener('scroll', save);
    };
  }, [key]);
}
