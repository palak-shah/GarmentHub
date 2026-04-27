import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, ClipboardList, LayoutDashboard, Package, Bookmark, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSelectionStore } from '@/store/selectionStore';
import { queryClient } from '@/lib/queryClient';
import { productApi } from '@/api/product.api';
import { networkApi } from '@/api/network.api';
import { orderApi } from '@/api/order.api';
import { vendorApi } from '@/api/vendor.api';
import type { Role } from '@/types';

const HIDDEN_ON_ROUTES = ['/products/', '/bulk-order', '/trader/share'];

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function getNavItems(role: Role): NavItem[] {
  if (role === 'VENDOR') {
    return [
      { to: '/vendor', label: 'Home', icon: <LayoutDashboard className="h-5 w-5" /> },
      { to: '/vendor/products', label: 'Products', icon: <Package className="h-5 w-5" /> },
      { to: '/network', label: 'People', icon: <Users className="h-5 w-5" /> },
      { to: '/vendor/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
      { to: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { to: '/admin/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
      { to: '/admin/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
      { to: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
    ];
  }
  return [
    { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { to: '/saved', label: 'Saved', icon: <Bookmark className="h-5 w-5" /> },
    { to: '/network', label: 'People', icon: <Users className="h-5 w-5" /> },
    { to: '/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
    { to: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];
}

function prefetchForRoute(to: string) {
  const userId = useAuthStore.getState().user?.id;
  switch (to) {
    case '/':
      queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: () => productApi.getCategories() });
      break;
    case '/saved':
      queryClient.prefetchQuery({ queryKey: ['saved-products'], queryFn: () => productApi.getSavedProducts() });
      break;
    case '/network':
      queryClient.prefetchQuery({ queryKey: ['network-connections'], queryFn: () => networkApi.getConnections() });
      queryClient.prefetchQuery({ queryKey: ['network-suggestions'], queryFn: () => networkApi.getSuggestions() });
      break;
    case '/orders':
      if (userId) queryClient.prefetchQuery({ queryKey: ['orders', userId], queryFn: () => orderApi.list() });
      break;
    case '/vendor':
      if (userId) queryClient.prefetchQuery({ queryKey: ['vendor-products', userId], queryFn: () => productApi.getMyProducts() });
      break;
    case '/vendor/products':
      if (userId) queryClient.prefetchQuery({ queryKey: ['vendor-products', userId], queryFn: () => productApi.getMyProducts() });
      break;
    case '/vendor/orders':
      if (userId) queryClient.prefetchQuery({ queryKey: ['vendor-orders', userId], queryFn: () => vendorApi.getIncomingOrders() });
      break;
  }
}

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role);
  const isSelecting = useSelectionStore((s) => s.isSelecting);
  const { pathname } = useLocation();

  const prefetch = useCallback((to: string) => {
    prefetchForRoute(to);
  }, []);

  const hiddenByRoute = HIDDEN_ON_ROUTES.some((r) => pathname.startsWith(r));
  if (!role || isSelecting || hiddenByRoute) return null;

  const items = getNavItems(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}>
      <div className="mx-auto flex max-w-4xl">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/' || item.to === '/vendor' || item.to === '/admin' || item.to === '/profile'}
            onTouchStart={() => prefetch(item.to)}
            onMouseEnter={() => prefetch(item.to)}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium min-h-[48px] justify-center transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
