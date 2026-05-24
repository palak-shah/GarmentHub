import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, UserPlus, UserCheck, Users, Sparkles, Share2, X, Phone, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { networkApi } from '@/api/network.api';
import { curationApi } from '@/api/curation.api';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { mediaUrl, thumbUrl } from '@/utils/mediaUrl';
import type { ConnectionUser } from '@/api/network.api';

const AVATAR_GRADIENTS = [
  'from-violet-400 to-purple-600',
  'from-sky-400 to-blue-600',
  'from-amber-400 to-orange-600',
  'from-emerald-400 to-green-600',
  'from-rose-400 to-pink-600',
  'from-indigo-400 to-blue-700',
  'from-teal-400 to-cyan-600',
  'from-fuchsia-400 to-purple-600',
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const letter = (name || '?')[0].toUpperCase();
  const gradient = getGradient(name || '?');
  const sizeClasses = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-11 w-11 text-base',
    lg: 'h-14 w-14 text-xl',
    xl: 'h-16 w-16 text-2xl',
  };
  return (
    <div className={`flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br ${gradient} ${sizeClasses[size]}`}>
      {letter}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    VENDOR: { label: 'Vendor', cls: 'bg-blue-500/10 text-blue-600' },
    TRADER: { label: 'Trader', cls: 'bg-purple-500/10 text-purple-600' },
    CUSTOMER: { label: 'Buyer', cls: 'bg-green-500/10 text-green-600' },
  };
  const c = config[role] || { label: role, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${c.cls}`}>
      {c.label}
    </span>
  );
}

function CompactUserCard({
  user,
  isFollowing,
  onToggle,
  loading,
  highlight,
  showPhone,
  inboundOnly = false,
  onOpenDetail,
  onConnect,
}: {
  user: ConnectionUser;
  isFollowing: boolean;
  onToggle: () => void;
  loading: boolean;
  highlight?: string;
  showPhone?: boolean;
  /** Vendor: connected traders (they follow you for updates) — never show Follow; Disconnect when connected. */
  inboundOnly?: boolean;
  /** Tap row to open detail (e.g. vendor trader insights); action buttons call stopPropagation. */
  onOpenDetail?: () => void;
  /** Vendor + not connected: in-app connect (trader already on GarmentHub). */
  onConnect?: () => void;
}) {
  const displayName = user.businessName || user.name;

  const highlightText = (text: string, query?: string) => {
    if (!query || query.length < 2) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary-100 text-primary-700 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div
      className={`flex items-center gap-3 py-3${onOpenDetail ? ' cursor-pointer rounded-xl active:bg-gray-50/80' : ''}`}
      onClick={onOpenDetail}
      role={onOpenDetail ? 'button' : undefined}
      onKeyDown={
        onOpenDetail
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail();
              }
            }
          : undefined
      }
      tabIndex={onOpenDetail ? 0 : undefined}
    >
      <Avatar name={displayName} size="md" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{highlightText(displayName, highlight)}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {user.role && <RoleBadge role={user.role} />}
          {user.businessName && user.name !== user.businessName && (
            <span className="truncate text-xs text-gray-400">{highlightText(user.name, highlight)}</span>
          )}
          {showPhone && user.phone && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <Phone className="h-2.5 w-2.5" />
              {highlightText(user.phone, highlight)}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {inboundOnly ? (
          isFollowing ? (
            <button
              type="button"
              onClick={() => onToggle()}
              disabled={loading}
              className="rounded-full px-4 py-2 text-xs font-bold bg-gray-100 text-gray-500 active:bg-gray-200 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : onConnect ? (
            <div className="flex max-w-[9.5rem] flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => onConnect()}
                disabled={loading}
                className="rounded-full px-4 py-2 text-xs font-bold bg-primary-600 text-white active:bg-primary-700 disabled:opacity-50"
              >
                Connect
              </button>
              <span className="text-right text-[10px] text-gray-400 leading-tight">
                Already on GarmentHub — adds them to your traders
              </span>
            </div>
          ) : (
            <span className="block max-w-[8.5rem] text-right text-xs text-gray-400 leading-tight">
              Not connected — they follow you for updates
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={() => onToggle()}
            disabled={loading}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              isFollowing
                ? 'bg-gray-100 text-gray-500 active:bg-gray-200'
                : 'bg-primary-600 text-white active:bg-primary-700'
            } disabled:opacity-50`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NetworkPage() {
  useScrollRestore('network');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isCustomer = role === 'CUSTOMER';
  const isTrader = role === 'TRADER';
  const isVendor = role === 'VENDOR';
  const canInvite = isTrader || isVendor;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(val), 300);
  };

  const cancelSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    searchInputRef.current?.blur();
  };

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  const isPhoneSearch = /^\+?\d{3,}$/.test(debouncedQuery.replace(/[\s-]/g, ''));
  const isSearchActive = searchQuery.length > 0;

  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ['network-search', debouncedQuery],
    queryFn: () => networkApi.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: inviteCode } = useQuery({
    queryKey: ['invite-code'],
    queryFn: () => networkApi.getInviteCode(),
    enabled: canInvite,
  });

  const shareInviteLink = async () => {
    let code = inviteCode?.code;
    if (!code) {
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['invite-code'],
          queryFn: () => networkApi.getInviteCode(),
        });
        code = data.code;
      } catch {
        toast.error('Could not load invite link');
        return;
      }
    }
    if (!code) {
      toast.error('Could not load invite link');
      return;
    }
    const url = `${window.location.origin}/login?invite=${code}`;
    const text = `Join me on GarmentHub! ${url}`;
    if (navigator.share) {
      navigator.share({ title: 'GarmentHub Invite', text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Invite link copied!');
    }
  };

  const { data: stories } = useQuery({
    queryKey: ['network-stories'],
    queryFn: () => networkApi.getStories(),
  });

  const { data: connections } = useQuery({
    queryKey: ['network-connections'],
    queryFn: () => networkApi.getConnections(),
  });

  const { data: suggestions } = useQuery({
    queryKey: ['network-suggestions'],
    queryFn: () => networkApi.getSuggestions(),
  });

  // For customers: fetch curated shares to show product thumbnails on trader cards
  const { data: curatedShares } = useQuery({
    queryKey: ['curated-received'],
    queryFn: () => curationApi.listReceived(),
    enabled: isCustomer,
  });

  // Group curated shares by trader for thumbnail previews
  const traderShareMap = useMemo(() => {
    if (!curatedShares) return new Map<string, { images: string[]; count: number }>();
    const map = new Map<string, { images: string[]; count: number }>();
    for (const share of curatedShares) {
      const tid = share.trader.id;
      const existing = map.get(tid) || { images: [], count: 0 };
      for (const p of share.products) {
        existing.count++;
        if (existing.images.length < 4 && p.images?.[0]) {
          existing.images.push(p.images[0]);
        }
      }
      map.set(tid, existing);
    }
    return map;
  }, [curatedShares]);

  const followMutation = useMutation({
    mutationFn: (userId: string) => networkApi.follow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
      queryClient.invalidateQueries({ queryKey: ['network-suggestions'] });
    },
    onError: (err: unknown) => {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
          : undefined;
      toast.error(data?.error ?? data?.message ?? 'Could not follow');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => networkApi.unfollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
      queryClient.invalidateQueries({ queryKey: ['network-suggestions'] });
    },
  });

  const vendorConnectMutation = useMutation({
    mutationFn: (traderId: string) => networkApi.connectTrader(traderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-connections'] });
      queryClient.invalidateQueries({ queryKey: ['network-suggestions'] });
      toast.success('Connected');
    },
    onError: (err: unknown) => {
      const data =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data
          : undefined;
      toast.error(data?.error ?? data?.message ?? 'Could not connect');
    },
  });

  const connectionIds = new Set(connections?.map((c) => c.id) ?? []);

  // Split connections by role for contextual display
  const traderConnections = useMemo(
    () => (connections ?? []).filter((c) => c.role === 'TRADER'),
    [connections],
  );
  const vendorConnections = useMemo(
    () => (connections ?? []).filter((c) => c.role === 'VENDOR'),
    [connections],
  );
  const customerConnections = useMemo(
    () => (connections ?? []).filter((c) => c.role === 'CUSTOMER'),
    [connections],
  );
  const otherConnections = useMemo(
    () => (connections ?? []).filter((c) => c.role !== 'TRADER'),
    [connections],
  );

  const handleShareInvite = () => {
    void shareInviteLink();
  };

  const navigateToTrader = (trader: ConnectionUser) => {
    const name = trader.businessName || trader.name;
    navigate(`/search?traderId=${trader.id}&traderName=${encodeURIComponent(name)}`);
  };

  const isEmpty =
    (!stories || stories.length === 0) &&
    (!connections || connections.length === 0) &&
    (!suggestions || suggestions.length === 0);

  return (
    <>
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl flex items-center gap-2 px-4 py-2.5">
          <h1 className="text-lg font-bold text-gray-900 shrink-0">{isVendor ? 'Connect' : 'People'}</h1>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={isVendor ? 'Search traders by name or phone...' : 'Search name or phone...'}
              className="w-full rounded-full bg-gray-100 py-2 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setDebouncedQuery(''); searchInputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {isSearchActive ? (
            <button onClick={cancelSearch} className="shrink-0 text-sm font-semibold text-primary-600 active:text-primary-700 py-1">
              Cancel
            </button>
          ) : canInvite ? (
            <button
              type="button"
              onClick={handleShareInvite}
              title={
                isVendor
                  ? 'Share invite link — for someone not on GarmentHub yet'
                  : 'Share invite link'
              }
              aria-label={
                isVendor ? 'Share invite link for people not on GarmentHub' : 'Share invite link'
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <UserPlus className="h-4 w-4 text-gray-600" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-4xl pb-4">
        {/* ── Search overlay ── */}
        {isSearchActive && (
          <div className="px-4">
            {debouncedQuery.length < 2 && (
              <div className="py-8 flex flex-col items-center text-center gap-2">
                <p className="text-sm text-gray-400">Type at least 2 characters to search</p>
                {isVendor ? (
                  <p className="text-xs text-gray-400 max-w-xs">
                    Search finds traders already on GarmentHub — tap{' '}
                    <span className="font-semibold text-gray-500">Connect</span> to add them. Use the{' '}
                    <span className="font-semibold text-gray-500">+</span> button for an invite link if they are not on
                    the app yet.
                  </p>
                ) : null}
              </div>
            )}

            {debouncedQuery.length >= 2 && searchLoading && (
              <div className="flex items-center justify-center py-12 gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                <span className="text-sm text-gray-400">Searching...</span>
              </div>
            )}

            {debouncedQuery.length >= 2 && !searchLoading && searchResults && searchResults.length > 0 && (
              <div className="divide-y divide-gray-100">
                {searchResults.map((u) => {
                  const alreadyFollowing = connectionIds.has(u.id);
                  return (
                    <CompactUserCard
                      key={u.id}
                      user={u}
                      isFollowing={alreadyFollowing}
                      inboundOnly={isVendor}
                      onOpenDetail={
                        isVendor && alreadyFollowing
                          ? () => navigate(`/network/traders/${u.id}`)
                          : undefined
                      }
                      onConnect={
                        isVendor && !alreadyFollowing
                          ? () => vendorConnectMutation.mutate(u.id)
                          : undefined
                      }
                      onToggle={() =>
                        alreadyFollowing
                          ? unfollowMutation.mutate(u.id)
                          : followMutation.mutate(u.id)
                      }
                      loading={
                        followMutation.isPending ||
                        unfollowMutation.isPending ||
                        vendorConnectMutation.isPending
                      }
                      highlight={debouncedQuery}
                      showPhone={isPhoneSearch}
                    />
                  );
                })}
              </div>
            )}

            {debouncedQuery.length >= 2 && !searchLoading && searchResults && searchResults.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
                  <Users className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-0.5">No one found</p>
                <p className="text-xs text-gray-400">
                  {isPhoneSearch
                    ? 'No account with this phone number'
                    : `No results for "${debouncedQuery}"`}
                </p>
                {canInvite && (
                  <button onClick={handleShareInvite} className="mt-3 rounded-full bg-primary-600 px-4 py-2 text-xs font-bold text-white active:bg-primary-700">
                    Invite via link
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Main content ── */}
        {!isSearchActive && (
          <>
            {/* Stories — recent activity */}
            {stories && stories.length > 0 && (
              <div className="pt-4 pb-1">
                <p className="px-4 pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">New uploads</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
                  {stories.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/search?vendorId=${s.id}`)}
                      className="flex w-[72px] shrink-0 flex-col items-center gap-2 group"
                    >
                      <div className="rounded-full p-[3px] bg-gradient-to-tr from-primary-400 to-primary-600 group-active:scale-95 transition-transform">
                        <div className="rounded-full bg-white p-[2px]">
                          <Avatar name={s.businessName || s.name} size="lg" />
                        </div>
                      </div>
                      <span className="max-w-[72px] truncate text-[11px] text-gray-600 font-medium">
                        {(s.businessName || s.name)?.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── CUSTOMER: My Traders (tappable cards with product thumbnails) ── */}
            {isCustomer && traderConnections.length > 0 && (
              <section className="pt-4 px-4">
                <p className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">My Traders</p>
                <div className="space-y-3">
                  {traderConnections.map((trader) => {
                    const name = trader.businessName || trader.name;
                    const shareData = traderShareMap.get(trader.id);
                    const thumbs = shareData?.images ?? [];
                    const productCount = shareData?.count ?? 0;

                    return (
                      <button
                        key={trader.id}
                        onClick={() => navigateToTrader(trader)}
                        className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100/80 active:bg-gray-50 text-left transition-colors"
                      >
                        <Avatar name={name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {productCount > 0
                              ? `${productCount} product${productCount !== 1 ? 's' : ''} shared`
                              : 'Tap to view'}
                          </p>
                        </div>

                        {/* Product thumbnail strip */}
                        {thumbs.length > 0 ? (
                          <div className="flex shrink-0 -space-x-2">
                            {thumbs.slice(0, 3).map((img, i) => (
                              <div key={i} className="h-10 w-10 overflow-hidden rounded-lg border-2 border-white bg-gray-100">
                                <img
                                  src={thumbUrl(img)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.includes('/thumbs/')) {
                                      target.src = mediaUrl(img);
                                    }
                                  }}
                                />
                              </div>
                            ))}
                            {thumbs.length > 3 && (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white bg-gray-100 text-[10px] font-bold text-gray-500">
                                +{thumbs.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── CUSTOMER: Other connections (non-trader) ── */}
            {isCustomer && otherConnections.length > 0 && (
              <section className="pt-4 px-4">
                <p className="pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Following</p>
                <div className="divide-y divide-gray-100">
                  {otherConnections.map((c) => (
                    <CompactUserCard
                      key={c.id}
                      user={c}
                      isFollowing
                      onToggle={() => unfollowMutation.mutate(c.id)}
                      loading={unfollowMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── TRADER: My Vendors (tappable, navigates to vendor products) ── */}
            {isTrader && vendorConnections.length > 0 && (
              <section className="pt-4 px-4">
                <p className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">My Vendors</p>
                <div className="space-y-2">
                  {vendorConnections.map((v) => {
                    const name = v.businessName || v.name;
                    return (
                      <button
                        key={v.id}
                        onClick={() => navigate(`/search?vendorId=${v.id}`)}
                        className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100/80 active:bg-gray-50 text-left transition-colors"
                      >
                        <Avatar name={name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                          <RoleBadge role="VENDOR" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── TRADER: My Customers ── */}
            {isTrader && customerConnections.length > 0 && (
              <section className="pt-4 px-4">
                <div className="flex items-center pb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">My Customers</p>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    {customerConnections.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {customerConnections.map((c) => (
                    <CompactUserCard
                      key={c.id}
                      user={c}
                      isFollowing
                      onToggle={() => unfollowMutation.mutate(c.id)}
                      loading={unfollowMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── VENDOR: Traders connected (follow you for updates) ── */}
            {isVendor && connections && connections.length > 0 && (
              <section className="pt-4">
                <div className="flex items-center px-4 pb-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Connected traders</p>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    {connections.length}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
                  {connections.map((c) => {
                    const name = c.businessName || c.name;
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/network/traders/${c.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/network/traders/${c.id}`);
                          }
                        }}
                        className="flex w-[140px] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50/80"
                      >
                        <Avatar name={name} size="lg" />
                        <div className="w-full text-center min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                          {c.role && <RoleBadge role={c.role} />}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            unfollowMutation.mutate(c.id);
                          }}
                          disabled={unfollowMutation.isPending}
                          className="w-full rounded-lg bg-gray-100 py-1.5 text-xs font-bold text-gray-500 active:bg-gray-200 disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Suggestions — prominent cards for customers, compact for others */}
            {suggestions && suggestions.length > 0 && (
              <section className="pt-4 px-4">
                <p className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isCustomer ? 'Traders to follow' : isTrader ? 'Vendors & customers to follow' : 'Suggested for you'}
                </p>
                {(isCustomer || isTrader) ? (
                  <div className="space-y-2">
                    {suggestions.map((s) => {
                      const name = s.businessName || s.name;
                      const alreadyFollowing = connectionIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100/80"
                        >
                          <Avatar name={name} size="lg" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {s.role && <RoleBadge role={s.role} />}
                              {s.businessName && s.name !== s.businessName && (
                                <span className="truncate text-xs text-gray-400">{s.name}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              alreadyFollowing
                                ? unfollowMutation.mutate(s.id)
                                : followMutation.mutate(s.id)
                            }
                            disabled={followMutation.isPending || unfollowMutation.isPending}
                            className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition-all ${
                              alreadyFollowing
                                ? 'bg-gray-100 text-gray-500 active:bg-gray-200'
                                : 'bg-primary-600 text-white active:bg-primary-700'
                            } disabled:opacity-50`}
                          >
                            {alreadyFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {suggestions.map((s) => (
                      <CompactUserCard
                        key={s.id}
                        user={s}
                        isFollowing={connectionIds.has(s.id)}
                        onToggle={() =>
                          connectionIds.has(s.id)
                            ? unfollowMutation.mutate(s.id)
                            : followMutation.mutate(s.id)
                        }
                        loading={followMutation.isPending || unfollowMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Empty state — only show if no connections AND no suggestions */}
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 mb-4">
                  <Users className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-900 mb-1">
                  {isCustomer ? 'Find your traders' : 'No connections yet'}
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  {isCustomer
                    ? 'Search for traders to follow and get curated product recommendations'
                    : isVendor
                      ? 'Search for traders already on GarmentHub and tap Connect. Use Share invite or + for someone not on the app yet — they can join and follow you for updates.'
                    : canInvite
                      ? 'Share your invite code to connect'
                      : 'Search for vendors and traders to follow'}
                </p>
                {canInvite && (
                  <button onClick={handleShareInvite} className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-bold text-white active:bg-primary-700">
                    <Share2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                    Share invite
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
