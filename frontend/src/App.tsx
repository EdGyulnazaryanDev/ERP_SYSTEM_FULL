import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ModulesPage from '@/pages/modules/ModulesPage';
import ModuleBuilderPage from '@/pages/modules/ModuleBuilderPage';
import ModuleDataPageEnhanced from '@/pages/modules/ModuleDataPageEnhanced';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import RBACPage from '@/pages/RBACPage';
import ProductsPage from '@/pages/products/ProductsPage';
import SuppliersPage from '@/pages/suppliers/SuppliersPage';
import UsersPage from '@/pages/users/UsersPage';
import TransactionsPage from '@/pages/transactions/TransactionsPage';
import TransactionFormPage from '@/pages/transactions/TransactionFormPage';
import TransactionAnalyticsPage from '@/pages/analytics/TransactionAnalyticsPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import InventoryFormPage from '@/pages/inventory/InventoryFormPage';
import ShipmentsPage from '@/pages/transportation/ShipmentsPage';
import ShipmentFormPage from '@/pages/transportation/ShipmentFormPage';
import CouriersPage from '@/pages/transportation/CouriersPage';
import ShipmentTrackingPage from '@/pages/transportation/ShipmentTrackingPage';
import TransportationPage from '@/pages/transportation/TransportationPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/auth/*"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <AuthLayout />
        }
      >
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route
        path="/*"
        element={
          isAuthenticated ? <MainLayout /> : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/builder" element={<ModuleBuilderPage />} />
        <Route path="modules/:moduleName/data" element={<ModuleDataPageEnhanced />} />
        <Route path="rbac" element={<RBACPage />} />
        <Route path="settings" element={<SettingsPage />} />
        
        {/* Transactions */}
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/create" element={<TransactionFormPage />} />
        <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
        <Route path="transactions/analytics" element={<TransactionAnalyticsPage />} />
        
        {/* Inventory */}
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/create" element={<InventoryFormPage />} />
        <Route path="inventory/:id/edit" element={<InventoryFormPage />} />
        
        {/* Transportation */}
        <Route path="transportation" element={<TransportationPage />} />
        <Route path="transportation/shipments" element={<ShipmentsPage />} />
        <Route path="transportation/shipments/create" element={<ShipmentFormPage />} />
        <Route path="transportation/shipments/:id" element={<ShipmentTrackingPage />} />
        <Route path="transportation/couriers" element={<CouriersPage />} />
      </Route>
      
      {/* Public tracking page */}
      <Route path="/track/:trackingNumber" element={<ShipmentTrackingPage />} />
    </Routes>
  );
}

export default App;
