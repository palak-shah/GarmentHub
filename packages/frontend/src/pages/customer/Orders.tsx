import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/store/authStore';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { Header } from '@/components/layout/Header';
import { OrderCard } from '@/components/order/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Order, OrderStatus, Role } from '@/types';
import { isPendingActionFromViewer } from '@/lib/orderWorkflow';

const STATUS_TABS: { label: string; statuses: OrderStatus[] }[] = [
  { label: 'Waiting', statuses: ['PENDING'] },
  { label: 'Done', statuses: ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED'] },
  { label: 'Cancelled', statuses: ['REJECTED', 'CANCELLED'] },
];

type TabDef =
  | { kind: 'from_me'; label: string }
  | { kind: 'status'; label: string; statuses: OrderStatus[] };

function buildTabDefs(role: Role | undefined): TabDef[] {
  if (role === 'CUSTOMER' || role === 'TRADER') {
    return [{ kind: 'from_me', label: 'Pending from me' }, ...STATUS_TABS.map((t) => ({ kind: 'status' as const, ...t }))];
  }
  return STATUS_TABS.map((t) => ({ kind: 'status' as const, ...t }));
}

type TraderFilter = 'all' | 'managed' | 'observed';

export default function CustomerOrders() {
  useScrollRestore('orders');
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const isTrader = user?.role === 'TRADER';
  const role = user?.role;
  /**
   * `null` = use smart default from current order counts (computed in render — no Pending→Waiting flash).
   * A number = user explicitly chose a tab.
   */
  const [activeTab, setActiveTab] = useState<number | null>(null);
  /** Default All so direct orders (favored price, etc.) are not hidden behind Managed-only. */
  const [traderFilter, setTraderFilter] = useState<TraderFilter>('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => orderApi.list() as Promise<Order[]>,
    enabled: !!userId,
  });

  // For traders, optional filter by mode, then by status
  const traderFiltered = isTrader
    ? (orders ?? []).filter((o) =>
        traderFilter === 'managed'
          ? o.orderMode === 'MANAGED'
          : traderFilter === 'observed'
            ? o.orderMode === 'DIRECT'
            : true,
      )
    : orders ?? [];

  const tabDefs = useMemo(() => buildTabDefs(role), [role]);

  const counts = useMemo(() => {
    return tabDefs.map((def) => {
      if (def.kind === 'from_me' && userId && (role === 'CUSTOMER' || role === 'TRADER')) {
        return traderFiltered.filter((o) => isPendingActionFromViewer(o, o.items, role, userId)).length;
      }
      if (def.kind === 'from_me') return 0;
      return traderFiltered.filter((o) => def.statuses.includes(o.status)).length;
    });
  }, [tabDefs, traderFiltered, userId, role]);

  const smartTabIndex = useMemo(() => {
    if (!userId) return 0;
    if (role !== 'CUSTOMER' && role !== 'TRADER') return 0;
    const fromMeIdx = tabDefs.findIndex((d) => d.kind === 'from_me');
    const fromMeCount = fromMeIdx >= 0 ? counts[fromMeIdx] : 0;
    if (fromMeCount > 0) return fromMeIdx;
    const firstNonEmpty = counts.findIndex((c, i) => i !== fromMeIdx && c > 0);
    if (firstNonEmpty >= 0) return firstNonEmpty;
    const waitingIdx = tabDefs.findIndex((d) => d.kind === 'status' && d.label === 'Waiting');
    return waitingIdx >= 0 ? waitingIdx : 0;
  }, [userId, role, tabDefs, counts]);

  useEffect(() => {
    setActiveTab(null);
  }, [userId]);

  useEffect(() => {
    if (activeTab !== null && activeTab >= tabDefs.length) setActiveTab(null);
  }, [tabDefs.length, activeTab]);

  const effectiveTab = Math.min(
    activeTab ?? smartTabIndex,
    Math.max(0, tabDefs.length - 1),
  );

  const filtered =
    userId && (role === 'CUSTOMER' || role === 'TRADER' || role === 'ADMIN' || role === 'VENDOR')
      ? traderFiltered.filter((o) => {
          const def = tabDefs[effectiveTab];
          if (!def) return false;
          if (def.kind === 'from_me') {
            if (role !== 'CUSTOMER' && role !== 'TRADER') return false;
            return isPendingActionFromViewer(o, o.items, role, userId);
          }
          return def.statuses.includes(o.status);
        })
      : [];

  const managedCount = isTrader ? (orders ?? []).filter((o) => o.orderMode === 'MANAGED').length : 0;
  const observedCount = isTrader ? (orders ?? []).filter((o) => o.orderMode === 'DIRECT').length : 0;
  const allTraderCount = isTrader ? (orders ?? []).length : 0;

  return (
    <>
      <Header title="Orders" />

      <div className="mx-auto max-w-4xl pb-4">
        {/* Trader: all / managed / direct (observed) */}
        {isTrader && (
          <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide border-b border-gray-100">
            {(
              [
                ['all', 'All', allTraderCount],
                ['managed', 'Managed', managedCount],
                ['observed', 'Direct', observedCount],
              ] as [TraderFilter, string, number][]
            ).map(
              ([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setTraderFilter(key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                    traderFilter === key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs ${traderFilter === key ? 'text-white/80' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        )}

        {/* Status filter pills */}
        <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide border-b border-gray-100">
          {tabDefs.map((tab, i) => (
            <button
              key={tab.kind === 'from_me' ? 'pending-from-me' : tab.label}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                effectiveTab === i ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
              {counts[i] > 0 && (
                <span className={`ml-1.5 text-xs ${effectiveTab === i ? 'text-white/80' : 'text-gray-400'}`}>
                  {counts[i]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4">
        {(!userId || isLoading) && !orders ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              tabDefs[effectiveTab]?.kind === 'from_me'
                ? 'Waiting'
                : `No ${(tabDefs[effectiveTab]?.label ?? 'matching').toLowerCase()} orders`
            }
            description={
              tabDefs[effectiveTab]?.kind === 'from_me'
                ? 'Nothing needs your confirmation right now. Open Waiting to follow orders in progress.'
                : 'Your orders will show up here'
            }
            icon={<ClipboardList className="h-16 w-16" />}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
}
