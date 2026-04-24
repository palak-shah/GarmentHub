import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingCart, ClipboardList, Package, LayoutDashboard, Users, Tag, Settings, ListTree } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function getNavItems(role: Role, cartCount: number): NavItem[] {
  if (role === 'VENDOR') {
    return [
      { to: '/vendor', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { to: '/vendor/brands', label: 'Brands', icon: <Tag className="h-5 w-5" /> },
      { to: '/vendor/catalog', label: 'Catalog', icon: <ListTree className="h-5 w-5" /> },
      { to: '/vendor/products', label: 'Products', icon: <Package className="h-5 w-5" /> },
      { to: '/vendor/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      { to: '/admin/users', label: 'Users', icon: <Users className="h-5 w-5" /> },
      { to: '/admin/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
      { to: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    ];
  }
  return [
    { to: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { to: '/search', label: 'Search', icon: <Search className="h-5 w-5" /> },
    { to: '/cart', label: 'Cart', icon: <ShoppingCart className="h-5 w-5" />, badge: cartCount },
    { to: '/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
  ];
}

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role);
  const cartCount = useCartStore((s) => s.items.length);

  if (!role) return null;

  const items = getNavItems(role, cartCount);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-4xl">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/' || item.to === '/vendor' || item.to === '/admin'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <div className="relative">
              {item.icon}
              {item.badge ? (
                <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
