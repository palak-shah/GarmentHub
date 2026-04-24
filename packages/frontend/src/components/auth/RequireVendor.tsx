import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/** Vendor API routes (e.g. image upload) require role VENDOR — block other roles from vendor UI. */
export function RequireVendor() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'VENDOR') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
