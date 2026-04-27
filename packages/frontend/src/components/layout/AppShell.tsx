import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <main key={pathname} className="flex-1 animate-page-in" style={{ paddingBottom: 'calc(4.5rem + max(8px, env(safe-area-inset-bottom, 0px)))' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
