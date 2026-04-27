import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckCircle2, Circle, MousePointerClick, X, RefreshCw } from 'lucide-react';
import { productApi } from '@/api/product.api';
import { curationApi } from '@/api/curation.api';
import { workflowApi } from '@/api/workflow.api';
import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/store/authStore';
import { useSelectionStore, type ShareOrderContext } from '@/store/selectionStore';
import { useMarkSeen } from '@/hooks/useMarkSeen';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { ProductCard } from '@/components/product/ProductCard';
import { SelectionActionBar } from '@/components/product/SelectionActionBar';
import { mediaUrl } from '@/utils/mediaUrl';
import type { CuratedShare, WorkflowState, Product } from '@/types';
import type { SentCuratedShare } from '@/api/curation.api';

function formatRecipientPill(names: string[]): string | undefined {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return undefined;
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} · ${unique[1]}`;
  return `${unique[0]} · ${unique[1]} +${unique.length - 2}`;
}

function formatShareSectionDateLabel(dateKey: string): string {
  if (dateKey === '_orphan') return 'Earlier shares';
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey === today) return 'Today';
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateKey === y) return 'Yesterday';
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  );
}

const WORKFLOW_TABS: { key: WorkflowState | 'NEW'; label: string }[] = [
  { key: 'NEW', label: 'Recent' },
  { key: 'SEEN', label: 'Pending' },
  { key: 'SHARED', label: 'Shared' },
  { key: 'ORDERED', label: 'Done' },
  { key: 'SKIPPED', label: 'Skipped' },
];

export default function CustomerHome() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSelecting, selectedIds, selectAll, deselectAll, clearSelection } = useSelectionStore();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [traderTab, setTraderTab] = useState<WorkflowState | 'NEW'>('NEW');
  const [activeStory, setActiveStory] = useState<string | null>(null);
  /** Customer home: filter network feed + curated strip by category without leaving the page. */
  const [feedCategoryId, setFeedCategoryId] = useState<string | null>(null);
  const [selectFilter, setSelectFilter] = useState('');
  const isTrader = role === 'TRADER';
  const filterRef = useRef<HTMLInputElement>(null);

  useScrollRestore(
    isTrader ? `home-trader-${traderTab}` : `home-feed-${feedCategoryId ?? 'all'}`,
  );
  const { onVisible, onHidden } = useMarkSeen();

  useEffect(() => {
    if (!isSelecting) setSelectFilter('');
  }, [isSelecting]);

  // Auto-refresh customer feed when seen-marking batch completes.
  // For traders, DON'T auto-invalidate the unseen list — it causes the grid
  // to reshuffle while browsing. Only counts update; the list refreshes on
  // explicit pull-to-refresh (like Instagram).
  useEffect(() => {
    const onSeenFlushed = () => {
      if (!isTrader) {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      }
      queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
    };
    window.addEventListener('garmenthub:seen-flushed', onSeenFlushed);
    return () => window.removeEventListener('garmenthub:seen-flushed', onSeenFlushed);
  }, [queryClient, isTrader]);

  // ── Data fetching ──

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.getCategories(),
  });

  // Customer: state-driven grouped feed
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed', feedCategoryId],
    queryFn: ({ pageParam }) =>
      productApi.feed({
        cursor: pageParam,
        limit: 20,
        ...(feedCategoryId ? { categoryId: feedCategoryId } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !isTrader,
  });

  // Trader: workflow API
  const { data: workflowCounts } = useQuery({
    queryKey: ['workflow-counts'],
    queryFn: () => workflowApi.counts(),
    enabled: isTrader,
  });

  const { data: workflowFeed, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflow-feed', traderTab],
    queryFn: () => workflowApi.feedByState(traderTab as WorkflowState),
    enabled: isTrader && traderTab !== 'NEW',
  });

  const { data: unseenProducts, isLoading: unseenLoading } = useQuery({
    queryKey: ['workflow-unseen'],
    queryFn: () => workflowApi.unseen(40),
    enabled: isTrader && traderTab === 'NEW',
    refetchOnWindowFocus: false,
  });

  const { data: unseenGrouped } = useQuery({
    queryKey: ['workflow-unseen-grouped'],
    queryFn: () => workflowApi.unseenGrouped(40),
    enabled: isTrader && traderTab === 'NEW',
    refetchOnWindowFocus: false,
  });

  // Curated shares for customers
  const { data: curatedShares } = useQuery({
    queryKey: ['curated-received'],
    queryFn: () => curationApi.listReceived(),
    enabled: role === 'CUSTOMER',
  });

  const markRead = useMutation({
    mutationFn: (shareId: string) => curationApi.markRead(shareId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['curated-received'] }),
  });

  const { data: traderAlerts } = useQuery({
    queryKey: ['trader-alerts'],
    queryFn: () => orderApi.traderAlerts(),
    enabled: isTrader,
    refetchInterval: 60000,
  });

  const { data: sentShares, isPending: sentSharesPending } = useQuery({
    queryKey: ['curation-sent', user?.id],
    queryFn: () => curationApi.listSent(),
    enabled: isTrader && traderTab === 'SHARED',
  });

  const sharedGroupedSections = useMemo(() => {
    if (traderTab !== 'SHARED' || !sentShares?.length) return [];
    const products = workflowFeed?.products ?? [];
    if (products.length === 0) return [];

    const idSet = new Set(products.map((p) => p.id));
    const byId = new Map(products.map((p) => [p.id, p] as const));
    const sortedShares = [...sentShares].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const assigned = new Set<string>();
    const dateToProducts = new Map<string, Product[]>();

    for (const share of sortedShares) {
      const dateKey = new Date(share.createdAt).toISOString().slice(0, 10);
      for (const row of share.products) {
        const pid = row.product.id;
        if (!idSet.has(pid) || assigned.has(pid)) continue;
        assigned.add(pid);
        const prod = byId.get(pid);
        if (!prod) continue;
        if (!dateToProducts.has(dateKey)) dateToProducts.set(dateKey, []);
        dateToProducts.get(dateKey)!.push(prod);
      }
    }

    const orphans: Product[] = [];
    for (const p of products) {
      if (!assigned.has(p.id)) orphans.push(p);
    }
    if (orphans.length > 0) {
      orphans.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      dateToProducts.set('_orphan', orphans);
    }

    const normalDates = [...dateToProducts.keys()]
      .filter((k) => k !== '_orphan')
      .sort((a, b) => b.localeCompare(a));
    const sections = normalDates.map((dateKey) => ({
      dateKey,
      products: dateToProducts.get(dateKey)!,
    }));
    if (dateToProducts.has('_orphan')) {
      sections.push({ dateKey: '_orphan', products: dateToProducts.get('_orphan')! });
    }
    return sections;
  }, [traderTab, sentShares, workflowFeed?.products]);

  const productSharedWithMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!sentShares?.length) return map;
    const nameSets = new Map<string, Set<string>>();
    for (const share of sentShares as SentCuratedShare[]) {
      const names = share.recipients
        .map((r) => r.customer.businessName || r.customer.name)
        .filter((n): n is string => Boolean(n && String(n).trim()));
      for (const row of share.products) {
        const pid = row.product.id;
        if (!nameSets.has(pid)) nameSets.set(pid, new Set());
        names.forEach((n) => nameSets.get(pid)!.add(n.trim()));
      }
    }
    for (const [pid, set] of nameSets) {
      const pill = formatRecipientPill([...set]);
      if (pill) map.set(pid, pill);
    }
    return map;
  }, [sentShares]);

  // ── Infinite scroll ──

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  // ── Derived data ──

  const allShares = curatedShares ?? [];

  // Group curated shares by trader for stories
  const sharesByTrader = allShares.reduce<Record<string, { trader: CuratedShare['trader']; shares: CuratedShare[]; products: Product[] }>>((acc, share) => {
    const tid = share.trader.id;
    if (!acc[tid]) acc[tid] = { trader: share.trader, shares: [], products: [] };
    acc[tid].shares.push(share);
    return acc;
  }, {});
  for (const tid of Object.keys(sharesByTrader)) {
    const g = sharesByTrader[tid];
    g.shares.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const seen = new Set<string>();
    g.products = [];
    for (const s of g.shares) {
      for (const p of s.products) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          g.products.push(p);
        }
      }
    }
  }
  const traderStories = Object.values(sharesByTrader).sort((a, b) => {
    const aUnread = a.shares.some((s) => !s.isRead) ? 1 : 0;
    const bUnread = b.shares.some((s) => !s.isRead) ? 1 : 0;
    if (bUnread !== aUnread) return bUnread - aUnread;
    return new Date(b.shares[0].createdAt).getTime() - new Date(a.shares[0].createdAt).getTime();
  });

  /** Latest share wins per product (for order mode + trader at checkout). */
  const shareOrderContextByProductId = useMemo(() => {
    const map = new Map<string, ShareOrderContext>();
    if (role !== 'CUSTOMER' || allShares.length === 0) return map;
    const sorted = [...allShares].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    for (const share of sorted) {
      const tid = share.trader.id;
      const mode = share.orderMode;
      for (const p of share.products) {
        if (!map.has(p.id)) map.set(p.id, { traderId: tid, orderMode: mode });
      }
    }
    return map;
  }, [role, allShares]);

  // Customer feed products from network
  const feedProducts = feedData?.pages.flatMap((p) => [...p.newProducts, ...p.pendingProducts, ...p.doneProducts]) ?? [];

  // Build unified customer feed: curated products first, then network (deduplicated)
  const curatedProductIds = new Set(traderStories.flatMap((g) => g.products.map((p) => p.id)));
  const curatedFirst = traderStories.flatMap((g) => g.products);
  const networkRest = feedProducts.filter((p) => !curatedProductIds.has(p.id));
  let customerFeed = [...curatedFirst, ...networkRest];
  if (feedCategoryId) {
    customerFeed = customerFeed.filter((p) => p.categoryId === feedCategoryId);
  }

  // Map productId → trader name for overlay chips
  const productTraderMap = new Map<string, string>();
  for (const group of traderStories) {
    const name = group.trader.businessName || group.trader.name || '';
    for (const p of group.products) {
      if (!productTraderMap.has(p.id)) productTraderMap.set(p.id, name);
    }
  }

  // When a story is tapped, filter to just that trader's products
  const filteredCustomerFeed = activeStory
    ? sharesByTrader[activeStory]?.products ?? []
    : customerFeed;

  // Trader products for active tab
  const traderProducts = isTrader
    ? traderTab === 'NEW' ? (unseenProducts ?? []) : (workflowFeed?.products ?? [])
    : [];

  // All visible products for select-all
  const rawVisibleProducts: Product[] = isTrader
    ? traderProducts
    : filteredCustomerFeed;

  // Apply search filter
  const q = selectFilter.toLowerCase().trim();
  const allVisibleProducts = q
    ? rawVisibleProducts.filter((p) => {
        const createdStr = new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase();
        const updatedStr = p.updatedAt
          ? new Date(p.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase()
          : '';
        const sharedWithHint =
          isTrader && traderTab === 'SHARED' ? (productSharedWithMap.get(p.id)?.toLowerCase() ?? '') : '';
        return (
          p.name?.toLowerCase().includes(q) ||
          p.vendor?.name?.toLowerCase().includes(q) ||
          p.vendor?.businessName?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q) ||
          p.fabric?.toLowerCase().includes(q) ||
          p.pattern?.toLowerCase().includes(q) ||
          p.color?.toLowerCase().includes(q) ||
          (p.price != null && String(p.price).includes(q)) ||
          createdStr.includes(q) ||
          updatedStr.includes(q) ||
          sharedWithHint.includes(q)
        );
      })
    : rawVisibleProducts;

  const loadingProducts = isTrader
    ? traderTab === 'NEW'
      ? unseenLoading
      : traderTab === 'SHARED'
        ? workflowLoading || sentSharesPending
        : workflowLoading
    : feedLoading;

  const allIds = allVisibleProducts.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-unseen'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-unseen-grouped'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-feed'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
    queryClient.invalidateQueries({ queryKey: ['curated-received'] });
    queryClient.invalidateQueries({ queryKey: ['curation-sent'] });
    queryClient.invalidateQueries({ queryKey: ['trader-alerts'] });
  };

  // ── Render helpers ──

  const renderGrid = (
    products: Product[],
    traderMap?: Map<string, string>,
    showUpdatedAt?: boolean,
    sharedWithMap?: Map<string, string>,
    shareCtxByProductId?: Map<string, ShareOrderContext>,
  ) => (
    <div className="grid grid-cols-2 gap-2 px-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onVisible={onVisible}
          onHidden={onHidden}
          sharedBy={traderMap?.get(product.id)}
          showUpdatedAt={showUpdatedAt}
          sharedWithLabel={sharedWithMap?.get(product.id)}
          shareOrderContext={shareCtxByProductId?.get(product.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 py-2.5">
          {isSelecting ? (
            <>
              <button onClick={clearSelection} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100">
                <X className="h-5 w-5 text-gray-600" />
              </button>
              <span className="text-sm font-bold text-gray-900 shrink-0">{selectedIds.size}</span>
            </>
          ) : (
            <h1 className="text-lg font-bold text-gray-900 shrink-0">
              {user?.name?.split(' ')[0] || 'GarmentHub'}
            </h1>
          )}

          {/* Search bar — always visible */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={filterRef}
              type="text"
              value={selectFilter}
              onChange={(e) => setSelectFilter(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {selectFilter && (
              <button onClick={() => { setSelectFilter(''); filterRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {isSelecting ? (
            <button
              onClick={() => (allSelected ? deselectAll(allIds) : selectAll(allIds, null))}
              className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold active:bg-gray-200"
            >
              {allSelected ? <CheckCircle2 className="h-4 w-4 text-primary-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
              {q ? allVisibleProducts.length : 'All'}
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              {allVisibleProducts.length > 0 && (
                <button
                  onClick={() => {
                    const first = allVisibleProducts[0];
                    const ctx =
                      !isTrader ? shareOrderContextByProductId.get(first.id) ?? null : null;
                    selectAll([first.id], ctx);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
                >
                  <MousePointerClick className="h-4 w-4 text-gray-600" />
                </button>
              )}
              <button onClick={handleRefresh} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200">
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl pb-4">
        {/* ═══ TRADER VIEW ═══ */}
        {isTrader && (
          <>
            {!isSelecting && traderAlerts && traderAlerts.length > 0 && (
              <div className="px-4 py-2">
                <button onClick={() => navigate('/orders')} className="w-full rounded-xl bg-red-50 border border-red-200 p-3 text-left">
                  <p className="text-sm font-bold text-red-700">{traderAlerts.length} order{traderAlerts.length > 1 ? 's' : ''} need attention</p>
                  <p className="text-xs text-red-500 mt-0.5">Tap to review</p>
                </button>
              </div>
            )}

            {!isSelecting && (
              <div className="flex overflow-x-auto px-4 py-2 gap-1 scrollbar-hide border-b border-gray-100">
                {WORKFLOW_TABS.map((tab) => {
                  const count = tab.key === 'NEW' ? (workflowCounts?.TOTAL ?? 0) : (workflowCounts?.[tab.key] ?? 0);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setTraderTab(tab.key)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                        traderTab === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && <span className={`ml-1.5 text-xs ${traderTab === tab.key ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {loadingProducts ? <SkeletonGrid /> : allVisibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                {q ? (
                  <p className="text-base font-medium">No matches for "{selectFilter}"</p>
                ) : (
                  <>
                    <p className="text-base font-medium">{traderTab === 'NEW' ? 'No products yet' : `No ${WORKFLOW_TABS.find(t => t.key === traderTab)?.label.toLowerCase()} products`}</p>
                    {traderTab === 'NEW' && <p className="text-sm mt-1">Products from vendors will appear here</p>}
                  </>
                )}
              </div>
            ) : traderTab === 'NEW' && !q && unseenGrouped && unseenGrouped.length > 0 ? (
              <div className="space-y-4">
                {unseenGrouped.map((group) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const label = group.date === today ? "Today's Collection" : new Date(group.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <div key={`${group.vendor.id}_${group.date}`}>
                      <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                          {(group.vendor.businessName || group.vendor.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{group.vendor.businessName || group.vendor.name}</p>
                          <p className="text-[10px] text-gray-400">{label}</p>
                        </div>
                      </div>
                      {renderGrid(group.products, undefined, true, undefined, undefined)}
                    </div>
                  );
                })}
              </div>
            ) : traderTab === 'SHARED' && !q && sharedGroupedSections.length > 0 ? (
              <div className="space-y-4">
                {sharedGroupedSections.map((section) => (
                  <div key={section.dateKey}>
                    <div className="px-4 pt-3 pb-1.5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {formatShareSectionDateLabel(section.dateKey)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Sent to customers</p>
                    </div>
                    {renderGrid(section.products, undefined, false, productSharedWithMap, undefined)}
                  </div>
                ))}
              </div>
            ) : renderGrid(
                allVisibleProducts,
                undefined,
                isTrader && traderTab === 'NEW',
                isTrader && traderTab === 'SHARED' ? productSharedWithMap : undefined,
                undefined,
              )}
          </>
        )}

        {/* ═══ CUSTOMER VIEW ═══ */}
        {!isTrader && (
          <>
            {/* ── Stories row (Instagram-style trader circles) ── */}
            {traderStories.length > 0 && !isSelecting && (
              <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide border-b border-gray-100">
                {/* "All" pill to reset filter */}
                <button
                  onClick={() => setActiveStory(null)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${!activeStory ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}>
                    <Search className={`h-5 w-5 ${!activeStory ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-[10px] w-16 text-center truncate ${!activeStory ? 'font-bold text-gray-900' : 'text-gray-500'}`}>All</span>
                </button>

                {traderStories.map(({ trader, shares, products }) => {
                  const hasUnread = shares.some((s) => !s.isRead);
                  const isActive = activeStory === trader.id;
                  const name = trader.businessName || trader.name || '?';
                  const initial = name[0].toUpperCase();
                  const thumb = products[0]?.images?.[0];

                  return (
                    <button
                      key={trader.id}
                      onClick={() => {
                        setActiveStory(isActive ? null : trader.id);
                        if (hasUnread) shares.filter((s) => !s.isRead).forEach((s) => markRead.mutate(s.id));
                      }}
                      className="flex flex-col items-center gap-1 shrink-0"
                    >
                      <div className={`rounded-full p-[2.5px] ${hasUnread ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' : isActive ? 'bg-primary-500' : 'bg-gray-300'}`}>
                        <div className="h-[60px] w-[60px] rounded-full border-2 border-white overflow-hidden bg-gray-100">
                          {thumb ? (
                            <img src={mediaUrl(thumb)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-lg font-bold text-gray-400">{initial}</div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] w-16 text-center truncate ${isActive ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Category chips (in-place feed filter; same layout as before) ── */}
            {!isSelecting && !activeStory && categories && categories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setFeedCategoryId(null)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                    feedCategoryId === null
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const selected = feedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFeedCategoryId(selected ? null : cat.id)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold min-h-[38px] transition-colors ${
                        selected
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Product grid ── */}
            {feedLoading ? <SkeletonGrid /> : allVisibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                {q ? (
                  <p className="text-base font-medium">No matches for "{selectFilter}"</p>
                ) : feedCategoryId ? (
                  <>
                    <p className="text-base font-medium">
                      No {categories?.find((c) => c.id === feedCategoryId)?.name ?? 'category'} yet
                    </p>
                    <p className="text-sm mt-1">Try All or another category</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium">No products yet</p>
                    <p className="text-sm mt-1">Follow a trader to see products</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {renderGrid(
                  allVisibleProducts,
                  activeStory ? undefined : productTraderMap,
                  false,
                  undefined,
                  shareOrderContextByProductId,
                )}
                <div ref={sentinelRef} className="h-4" />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {isSelecting && <SelectionActionBar />}
    </>
  );
}
