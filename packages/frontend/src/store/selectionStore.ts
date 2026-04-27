import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ShareOrderContext = { traderId: string; orderMode: 'DIRECT' | 'MANAGED' };

interface SelectionState {
  selectedIds: Set<string>;
  isSelecting: boolean;
  pendingOrderMode: 'DIRECT' | 'MANAGED' | null;
  /** Trader from curated share — sent with checkout so managed flow links to the right trader. */
  pendingTraderId: string | null;
  enterSelectionMode: (firstId: string, share?: ShareOrderContext) => void;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[], share?: ShareOrderContext | null) => void;
  deselectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setOrderMode: (mode: 'DIRECT' | 'MANAGED' | null) => void;
}

function ensureSet(val: unknown): Set<string> {
  if (val instanceof Set) return val;
  if (Array.isArray(val)) return new Set(val);
  return new Set();
}

export const useSelectionStore = create<SelectionState>()(
  persist(
    (set) => ({
      selectedIds: new Set<string>(),
      isSelecting: false,
      pendingOrderMode: null,
      pendingTraderId: null,

      enterSelectionMode: (firstId, share) => {
        navigator.vibrate?.(50);
        set({
          isSelecting: true,
          selectedIds: new Set([firstId]),
          pendingOrderMode: share?.orderMode ?? null,
          pendingTraderId: share?.traderId ?? null,
        });
      },

      toggleItem: (id) => {
        navigator.vibrate?.(30);
        set((state) => {
          const next = new Set(ensureSet(state.selectedIds));
          if (next.has(id)) {
            next.delete(id);
            if (next.size === 0)
              return { selectedIds: next, isSelecting: false, pendingOrderMode: null, pendingTraderId: null };
          } else {
            next.add(id);
          }
          return { selectedIds: next };
        });
      },

      selectAll: (ids, share) => {
        navigator.vibrate?.(50);
        set((state) => {
          const next = new Set(ensureSet(state.selectedIds));
          for (const id of ids) next.add(id);
          return {
            selectedIds: next,
            isSelecting: true,
            pendingOrderMode: share != null ? share.orderMode : null,
            pendingTraderId: share != null ? share.traderId : null,
          };
        });
      },

      deselectAll: (ids) => {
        set((state) => {
          const next = new Set(ensureSet(state.selectedIds));
          for (const id of ids) next.delete(id);
          if (next.size === 0)
            return { selectedIds: next, isSelecting: false, pendingOrderMode: null, pendingTraderId: null };
          return { selectedIds: next };
        });
      },

      clearSelection: () =>
        set({ selectedIds: new Set(), isSelecting: false, pendingOrderMode: null, pendingTraderId: null }),

      setOrderMode: (mode) => set({ pendingOrderMode: mode }),
    }),
    {
      name: 'garmenthub-selection',
      storage: {
        getItem: (name) => {
          const raw = sessionStorage.getItem(name);
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.state?.selectedIds) {
              parsed.state.selectedIds = new Set(parsed.state.selectedIds);
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          const v = value as { state: { selectedIds: Set<string> } };
          const serializable = {
            ...v,
            state: { ...v.state, selectedIds: Array.from(ensureSet(v.state.selectedIds)) },
          };
          sessionStorage.setItem(name, JSON.stringify(serializable));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<SelectionState> | undefined;
        const next = {
          ...current,
          ...p,
          selectedIds: ensureSet(p?.selectedIds),
        };
        if (next.pendingOrderMode === 'MANAGED' && !next.pendingTraderId) {
          next.pendingOrderMode = null;
        }
        return next;
      },
    },
  ),
);
