import { queryClient } from './queryClient';

/**
 * Drops cached per-session data (vendor/customer orders, admin, vendor form product).
 * Public catalog keys (e.g. `['products', 'home']`, `['categories']`) are kept so the app
 * feels faster after sign-out. Call on logout and 401 — avoid `queryClient.clear()` for speed.
 */
export function clearSessionQueryData(): void {
  const roots: readonly string[] = [
    'vendor-products',
    'vendor-orders',
    'vendor-brands',
    'vendor-catalog',
    'vendor-product-categories',
    'orders',
    'admin-users',
    'admin-stats',
    'admin-orders',
    'admin-categories',
  ];
  for (const root of roots) {
    queryClient.removeQueries({ queryKey: [root] });
  }
  queryClient.removeQueries({
    predicate: (q) => {
      const k = q.queryKey;
      return Array.isArray(k) && k[0] === 'product' && k.length === 3;
    },
  });
}
