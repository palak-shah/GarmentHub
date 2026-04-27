import { useRef, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { workflowApi } from '@/api/workflow.api';

const SEEN_DELAY_MS = 1200;
const BATCH_INTERVAL_MS = 2500;

const alreadyMarked = new Set<string>();
const pendingIds = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushSeen() {
  if (pendingIds.size === 0) return;
  const ids = Array.from(pendingIds);
  pendingIds.clear();
  try {
    await workflowApi.markBulk(ids, 'SEEN');
    for (const id of ids) alreadyMarked.add(id);
    window.dispatchEvent(new CustomEvent('garmenthub:seen-flushed'));
  } catch {
    for (const id of ids) pendingIds.add(id);
  }
}

function scheduleSeen(id: string) {
  if (alreadyMarked.has(id)) return;
  pendingIds.add(id);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSeen();
    }, BATCH_INTERVAL_MS);
  }
}

export function useMarkSeen() {
  const token = useAuthStore((s) => s.token);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const onVisible = useCallback(
    (productId: string) => {
      if (!token) return;
      if (alreadyMarked.has(productId)) return;
      if (timers.current.has(productId)) return;
      const t = setTimeout(() => {
        timers.current.delete(productId);
        scheduleSeen(productId);
      }, SEEN_DELAY_MS);
      timers.current.set(productId, t);
    },
    [token],
  );

  const onHidden = useCallback((productId: string) => {
    const t = timers.current.get(productId);
    if (t) {
      clearTimeout(t);
      timers.current.delete(productId);
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
      flushSeen();
    };
  }, []);

  return { onVisible, onHidden };
}
