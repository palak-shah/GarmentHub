import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Package, ShoppingBag, Users, Share2, UserPlus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import { networkApi } from '@/api/network.api';
import { useScrollRestore } from '@/hooks/useScrollRestore';

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400 leading-snug">{hint}</p> : null}
    </div>
  );
}

export default function TraderInsightsPage() {
  useScrollRestore('vendor-trader-insights');
  const { traderId } = useParams<{ traderId: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trader-insights', traderId],
    queryFn: () => networkApi.getTraderInsights(traderId!),
    enabled: role === 'VENDOR' && !!traderId,
    retry: false,
  });

  useEffect(() => {
    if (!isError || !error) return;
    const ax = error as { response?: { data?: { error?: string } } };
    toast.error(ax.response?.data?.error ?? 'Could not load trader');
    navigate('/network', { replace: true });
  }, [isError, error, navigate]);

  if (role !== 'VENDOR') {
    return <Navigate to="/network" replace />;
  }

  if (!traderId) {
    return <Navigate to="/network" replace />;
  }

  const title = data
    ? data.trader.businessName || data.trader.name
    : 'Trader';

  return (
    <>
      <Header title={title} showBack hideBell />
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-2">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        {data && (
          <>
            <p className="mb-1 text-sm text-gray-500">
              {data.trader.businessName && data.trader.name !== data.trader.businessName
                ? data.trader.name
                : 'Trader'}
            </p>
            <p className="mb-6 text-xs text-gray-400">
              Orders and reach include activity routed through this trader. Buyers follow them to get updates on your
              catalog.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Orders with your lines"
                value={data.stats.ordersCount}
                hint="Orders they placed that include your products (released to you, not cancelled)."
              />
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Buyers in those orders"
                value={data.stats.uniqueBuyersFromOrders}
                hint="Distinct customers on orders that included your products through this trader."
              />
              <StatCard
                icon={<UserPlus className="h-5 w-5" />}
                label="Buyers following them"
                value={data.stats.buyersFollowingTrader}
                hint="Customers connected to this trader on GarmentHub."
              />
              <StatCard
                icon={<Share2 className="h-5 w-5" />}
                label="Curated share reach"
                value={data.stats.curatedShareRecipients}
                hint="Distinct buyers who received at least one of their curated shares."
              />
              <StatCard
                icon={<Package className="h-5 w-5" />}
                label="Active listings for them"
                value={data.stats.activeProductsWithTrader}
                hint="Your active products assigned to this trader."
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
