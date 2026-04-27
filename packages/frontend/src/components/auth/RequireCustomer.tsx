import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

/** Placing orders (POST /orders) is CUSTOMER-only — block traders/vendors/admins from checkout UI. */
export function RequireCustomer() {
  const role = useAuthStore((s) => s.user?.role);
  const toasted = useRef(false);

  useEffect(() => {
    if (role && role !== 'CUSTOMER' && !toasted.current) {
      toasted.current = true;
      toast.error('Only buyer accounts can place orders. Sign in with Buyer, or ask your customer to check out.');
    }
  }, [role]);

  if (role !== 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
