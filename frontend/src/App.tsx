import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ActivatePortalPage from '@/pages/auth/ActivatePortalPage';
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
import AccountingPage from '@/pages/accounting/AccountingPage';
import HRPage from '@/pages/hr/HRPage';
import CRMPage from '@/pages/crm/CRMPage';
import ProcurementPage from '@/pages/procurement/ProcurementPage';
import WarehousePage from '@/pages/warehouse/WarehousePage';
import ProjectsPage from '@/pages/projects/ProjectsPage';
import ManufacturingPage from '@/pages/manufacturing/ManufacturingPage';
import AssetsPage from '@/pages/assets/AssetsPage';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import CommunicationPage from '@/pages/communication/CommunicationPage';
import CompliancePage from '@/pages/compliance/CompliancePage';
import BiReportingPage from '@/pages/bi/BiReportingPage';
import ServicesPage from '@/pages/services/ServicesPage';
import PageAccessGuard from '@/components/common/PageAccessGuard';
import PortalHomePage from '@/pages/PortalHomePage';
import SubscriptionPlansPage from '@/pages/admin/SubscriptionPlansPage';
import TenantsPage from '@/pages/admin/TenantsPage';
import PlanAssignmentPage from '@/pages/admin/PlanAssignmentPage';
import GlobalSettingsPage from '@/pages/admin/GlobalSettingsPage';
import SystemHealthPage from '@/pages/admin/SystemHealthPage';
import SubscriptionPage from '@/pages/settings/SubscriptionPage';
import TenantAdminRoute from '@/components/TenantAdminRoute';
import ProfilePage from '@/pages/profile/ProfilePage';
import MyProfilePage from '@/pages/profile/MyProfilePage';

function guarded(pageKey: string, element: JSX.Element) {
  return <PageAccessGuard pageKey={pageKey}>{element}</PageAccessGuard>;
}

function App() {
  const { isAuthenticated, user, isSystemAdmin } = useAuthStore();
  const isStaffUser = user?.actorType !== 'customer' && user?.actorType !== 'supplier';
  const location = useLocation();
  const isPortalActivationPath = location.pathname === '/auth/activate';

  // System admin default landing
  const defaultAuthenticatedPath = isSystemAdmin ? '/admin/tenants' : (isStaffUser ? '/' : '/portal');

  return (
    <Routes>
      <Route
        path="/auth/*"
        element={
          isAuthenticated && !isPortalActivationPath
            ? <Navigate to={defaultAuthenticatedPath} replace />
            : <AuthLayout />
        }
      >
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="activate" element={<ActivatePortalPage />} />
      </Route>

      {/* Platform Admin routes — only accessible to system admin */}
      <Route
        path="/admin/*"
        element={
          !isAuthenticated
            ? <Navigate to="/auth/login" replace />
            : isSystemAdmin
              ? <AdminLayout />
              : <Navigate to="/" replace />
        }
      >
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="plans" element={<SubscriptionPlansPage />} />
        <Route path="plan-assignment" element={<PlanAssignmentPage />} />
        <Route path="settings" element={<GlobalSettingsPage />} />
        <Route path="system-health" element={<SystemHealthPage />} />
        <Route path="profile" element={<MyProfilePage />} />
        <Route index element={<Navigate to="tenants" replace />} />
      </Route>

      {/* ERP routes — tenant users only */}
      <Route
        path="/*"
        element={
          isAuthenticated
            ? isSystemAdmin
              ? <Navigate to="/admin/tenants" replace />
              : (isStaffUser ? <MainLayout /> : <Navigate to="/portal" replace />)
            : <Navigate to="/auth/login" replace />
        }
      >
        <Route index element={guarded('dashboard', <DashboardPage />)} />
        <Route path="products" element={guarded('products', <ProductsPage />)} />
        <Route path="suppliers" element={guarded('suppliers', <SuppliersPage />)} />
        <Route path="users" element={guarded('users', <UsersPage />)} />
        <Route path="categories" element={guarded('categories', <CategoriesPage />)} />
        <Route path="modules" element={guarded('modules', <ModulesPage />)} />
        <Route path="modules/builder" element={guarded('modules', <ModuleBuilderPage />)} />
        <Route path="modules/:moduleName/data" element={guarded('modules', <ModuleDataPageEnhanced />)} />
        <Route path="rbac" element={guarded('rbac', <RBACPage />)} />
        <Route path="settings" element={guarded('settings', <SettingsPage />)} />

        {/* Transactions */}
        <Route path="transactions" element={guarded('transactions', <TransactionsPage />)} />
        <Route path="transactions/create" element={guarded('transactions', <TransactionFormPage />)} />
        <Route path="transactions/:id/edit" element={guarded('transactions', <TransactionFormPage />)} />
        <Route path="transactions/analytics" element={guarded('transactions', <TransactionAnalyticsPage />)} />

        {/* Inventory */}
        <Route path="inventory" element={guarded('inventory', <InventoryPage />)} />
        <Route path="inventory/create" element={guarded('inventory', <InventoryFormPage />)} />
        <Route path="inventory/:id/edit" element={guarded('inventory', <InventoryFormPage />)} />

        {/* Transportation */}
        <Route path="transportation" element={guarded('transportation', <TransportationPage />)} />
        <Route path="transportation/shipments" element={guarded('transportation', <ShipmentsPage />)} />
        <Route path="transportation/shipments/create" element={guarded('transportation', <ShipmentFormPage />)} />
        <Route path="transportation/shipments/:id" element={guarded('transportation', <ShipmentTrackingPage />)} />
        <Route path="transportation/couriers" element={guarded('transportation', <CouriersPage />)} />

        {/* Accounting */}
        <Route path="accounting" element={guarded('accounting', <AccountingPage />)} />

        {/* HR */}
        <Route path="hr" element={guarded('hr', <HRPage />)} />

        {/* CRM */}
        <Route path="crm" element={guarded('crm', <CRMPage />)} />

        {/* Procurement */}
        <Route path="procurement" element={guarded('procurement', <ProcurementPage />)} />

        {/* Warehouse */}
        <Route path="warehouse" element={guarded('warehouse', <WarehousePage />)} />

        {/* Projects */}
        <Route path="projects" element={guarded('projects', <ProjectsPage />)} />

        {/* Manufacturing */}
        <Route path="manufacturing" element={guarded('manufacturing', <ManufacturingPage />)} />

        {/* Equipment/Assets */}
        <Route path="equipment" element={guarded('equipment', <AssetsPage />)} />

        {/* Payments */}
        <Route path="payments" element={guarded('payments', <PaymentsPage />)} />

        {/* Communication */}
        <Route path="communication" element={guarded('communication', <CommunicationPage />)} />

        {/* Compliance */}
        <Route path="compliance" element={guarded('compliance', <CompliancePage />)} />

        {/* BI & reporting */}
        <Route path="bi" element={guarded('bi', <BiReportingPage />)} />

        {/* Services */}
        <Route path="services" element={guarded('services', <ServicesPage />)} />

        {/* Tenant subscription management — tenant admin only */}
        <Route element={<TenantAdminRoute />}>
          <Route path="settings/subscription" element={<SubscriptionPage />} />
        </Route>

        {/* Profile — any authenticated tenant user */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Profile — all staff users */}
        <Route path="profile" element={<MyProfilePage />} />
      </Route>

      <Route
        path="/portal"
        element={
          isAuthenticated
            ? (!isStaffUser ? <PortalHomePage /> : <Navigate to="/" replace />)
            : <Navigate to="/auth/login" replace />
        }
      />

      {/* Public tracking page */}
      <Route path="/track/:trackingNumber" element={<ShipmentTrackingPage />} />
    </Routes>
  );
}

export default App;
