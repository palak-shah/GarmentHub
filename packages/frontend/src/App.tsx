import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/Login';

import CustomerHome from '@/pages/customer/Home';
import ProductListing from '@/pages/customer/ProductListing';
import ProductDetail from '@/pages/customer/ProductDetail';
import Cart from '@/pages/customer/Cart';
import CustomerOrders from '@/pages/customer/Orders';
import OrderDetail from '@/pages/customer/OrderDetail';

import VendorDashboard from '@/pages/vendor/Dashboard';
import VendorBrandList from '@/pages/vendor/BrandList';
import VendorProductList from '@/pages/vendor/ProductList';
import ProductForm from '@/pages/vendor/ProductForm';
import IncomingOrders from '@/pages/vendor/IncomingOrders';
import VendorOrderHistory from '@/pages/vendor/OrderHistory';

import AdminDashboard from '@/pages/admin/Dashboard';
import UserManagement from '@/pages/admin/UserManagement';
import AdminOrderOverview from '@/pages/admin/OrderOverview';
import SettingsCategories from '@/pages/admin/SettingsCategories';
import VendorCatalog from '@/pages/vendor/VendorCatalog';
import { RequireVendor } from '@/components/auth/RequireVendor';

function RoleRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'VENDOR') return <Navigate to="/vendor" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <CustomerHome />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        {/* Customer */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/search" element={<ProductListing />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<CustomerOrders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />

        {/* Vendor — uploads require VENDOR role on the API */}
        <Route element={<RequireVendor />}>
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/vendor/brands" element={<VendorBrandList />} />
          <Route path="/vendor/products" element={<VendorProductList />} />
          <Route path="/vendor/products/new" element={<ProductForm />} />
          <Route path="/vendor/products/:id/edit" element={<ProductForm />} />
          <Route path="/vendor/orders" element={<IncomingOrders />} />
          <Route path="/vendor/history" element={<VendorOrderHistory />} />
          <Route path="/vendor/catalog" element={<VendorCatalog />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/orders" element={<AdminOrderOverview />} />
        <Route path="/admin/settings" element={<SettingsCategories />} />
      </Route>
    </Routes>
  );
}
