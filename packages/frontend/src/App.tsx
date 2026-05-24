import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppShell } from '@/components/layout/AppShell';
import Login from '@/pages/Login';

import CustomerHome from '@/pages/customer/Home';
import ProductListing from '@/pages/customer/ProductListing';
import ProductDetail from '@/pages/customer/ProductDetail';
import BulkOrder from '@/pages/customer/BulkOrder';
import CustomerSharedGallery from '@/pages/customer/CustomerSharedGallery';
import CustomerOrders from '@/pages/customer/Orders';
import OrderDetail from '@/pages/customer/OrderDetail';
import SavedProducts from '@/pages/customer/SavedProducts';
import NetworkPage from '@/pages/Network';
import NotificationsPage from '@/pages/Notifications';
import ProfilePage from '@/pages/Profile';
import ShareProducts from '@/pages/trader/ShareProducts';
import TraderProductGallery from '@/pages/trader/TraderProductGallery';
import CustomerGroups from '@/pages/trader/CustomerGroups';
import CustomerGroupDetail from '@/pages/trader/CustomerGroupDetail';

import VendorDashboard from '@/pages/vendor/Dashboard';
import VendorBrandList from '@/pages/vendor/BrandList';
import VendorProductList from '@/pages/vendor/ProductList';
import ProductForm from '@/pages/vendor/ProductForm';
import VendorUpload from '@/pages/vendor/Upload';
import IncomingOrders from '@/pages/vendor/IncomingOrders';
import VendorOrderHistory from '@/pages/vendor/OrderHistory';

import AdminDashboard from '@/pages/admin/Dashboard';
import UserManagement from '@/pages/admin/UserManagement';
import AdminOrderOverview from '@/pages/admin/OrderOverview';
import SettingsCategories from '@/pages/admin/SettingsCategories';
import VendorCatalog from '@/pages/vendor/VendorCatalog';
import TraderInsights from '@/pages/vendor/TraderInsights';
import { RequireVendor } from '@/components/auth/RequireVendor';
import { RequireCustomer } from '@/components/auth/RequireCustomer';

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
        {/* Customer / Trader */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/search" element={<ProductListing />} />
        <Route path="/products/:id/gallery" element={<TraderProductGallery />} />
        <Route element={<RequireCustomer />}>
          <Route path="/bulk-order" element={<BulkOrder />} />
        </Route>
        <Route path="/products/:id/customer-shared" element={<CustomerSharedGallery />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/network/traders/:traderId" element={<TraderInsights />} />
        <Route path="/orders" element={<CustomerOrders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/saved" element={<SavedProducts />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trader/share" element={<ShareProducts />} />
        <Route path="/trader/groups" element={<CustomerGroups />} />
        <Route path="/trader/groups/:groupId" element={<CustomerGroupDetail />} />

        {/* Vendor */}
        <Route element={<RequireVendor />}>
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/vendor/brands" element={<VendorBrandList />} />
          <Route path="/vendor/products" element={<VendorProductList />} />
          <Route path="/vendor/products/new" element={<ProductForm />} />
          <Route path="/vendor/products/:id/edit" element={<ProductForm />} />
          <Route path="/vendor/upload" element={<VendorUpload />} />
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
