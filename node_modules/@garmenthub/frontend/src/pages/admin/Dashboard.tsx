import { useQuery } from '@tanstack/react-query';
import { Users, Package, ClipboardList, TrendingUp } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { Header } from '@/components/layout/Header';
import { PageSpinner } from '@/components/ui/Spinner';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) return <><Header title="Admin Dashboard" /><PageSpinner /></>;
  if (!stats) return null;

  return (
    <>
      <Header title="Admin Dashboard" />
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Users className="h-6 w-6 text-blue-500" />} label="Total Users" value={stats.users.total} />
          <StatCard icon={<Package className="h-6 w-6 text-green-500" />} label="Active Products" value={stats.products} />
          <StatCard icon={<ClipboardList className="h-6 w-6 text-orange-500" />} label="Total Orders" value={stats.orders.total} />
          <StatCard icon={<TrendingUp className="h-6 w-6 text-purple-500" />} label="Vendors" value={stats.users.vendors} />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">User Breakdown</h3>
          <div className="space-y-2">
            <BarItem label="Customers" value={stats.users.customers} total={stats.users.total} color="bg-blue-500" />
            <BarItem label="Vendors" value={stats.users.vendors} total={stats.users.total} color="bg-green-500" />
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Orders by Status</h3>
          <div className="space-y-2">
            {Object.entries(stats.orders.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{status.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      {icon}
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function BarItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
