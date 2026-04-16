import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';
import PageAccessGuard from '@/components/common/PageAccessGuard';
import TenantAdminRoute from '@/components/TenantAdminRoute';

// Eagerly loaded (auth critical path)
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ActivatePortalPage from '@/pages/auth/ActivatePortalPage';

// Lazy loaded pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ModulesPage = lazy(() => import('@/pages/modules/ModulesPage'));
const ModuleBuilderPage = lazy(() => import('@/pages/modules/ModuleBuilderPage'));
const ModuleDataPageEnhanced = lazy(() => import('@/pages/modules/ModuleDataPageEnhanced'));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const RBACPage = lazy(() => import('@/pages/RBACPage'));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));
const TransactionFormPage = lazy(() => import('@/pages/transactions/TransactionFormPage'));
const TransactionAnalyticsPage = lazy(() => import('@/pages/analytics/TransactionAnalyticsPage'));
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage'));
const InventoryFormPage = lazy(() => import('@/pages/inventory/InventoryFormPage'));
const ShipmentsPage = lazy(() => import('@/pages/transportation/ShipmentsPage'));
const ShipmentFormPage = lazy(() => import('@/pages/transportation/ShipmentFormPage'));
const CouriersPage = lazy(() => import('@/pages/transportation/CouriersPage'));
const ShipmentTrackingPage = lazy(() => import('@/pages/transportation/ShipmentTrackingPage'));
const TransportationPage = lazy(() => import('@/pages/transportation/TransportationPage'));
const AccountingPage = lazy(() => import('@/pages/accounting/AccountingPage'));
const HRPage = lazy(() => import('@/pages/hr/HRPage'));
const CRMPage = lazy(() => import('@/pages/crm/CRMPage'));
const ProcurementPage = lazy(() => import('@/pages/procurement/ProcurementPage'));
const WarehousePage = lazy(() => import('@/pages/warehouse/WarehousePage'));
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage'));
const ManufacturingPage = lazy(() => import('@/pages/manufacturing/ManufacturingPage'));
const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage'));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage'));
const CommunicationPage = lazy(() => import('@/pages/communication/CommunicationPage'));
const CompliancePage = lazy(() => import('@/pages/compliance/CompliancePage'));
const BiReportingPage = lazy(() => import('@/pages/bi/BiReportingPage'));
const PortalHomePage = lazy(() => import('@/pages/PortalHomePage'));
const SubscriptionPlansPage = lazy(() => import('@/pages/admin/SubscriptionPlansPage'));
const TenantsPage = lazy(() => import('@/pages/admin/TenantsPage'));
const PlanAssignmentPage = lazy(() => import('@/pages/admin/PlanAssignmentPage'));
const GlobalSettingsPage = lazy(() => import('@/pages/admin/GlobalSettingsPage'));
const SystemHealthPage = lazy(() => import('@/pages/admin/SystemHealthPage'));
const SubscriptionPage = lazy(() => import('@/pages/settings/SubscriptionPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const MyProfilePage = lazy(() => import('@/pages/profile/MyProfilePage'));
const AdminServicesPage = lazy(() => import('@/pages/services/ServicesPage'));
const DocumentsPage = lazy(() => import('@/pages/documents/DocumentsPage'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spin size="large" />
  </div>
);

function guarded(pageKey: string, element: JSX.Element) {
  return <PageAccessGuard pageKey={pageKey}>{element}</PageAccessGuard>;
}

function App() {
  const { isAuthenticated, user, isSystemAdmin } = useAuthStore();
  const isStaffUser = user?.actorType !== 'customer' && user?.actorType !== 'supplier';
  const location = useLocation();
  const isPortalActivationPath = location.pathname === '/auth/activate';

  const defaultAuthenticatedPath = isSystemAdmin ? '/admin/tenants' : (isStaffUser ? '/' : '/portal');

  return (
    <Suspense fallback={<PageLoader />}>
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

        {/* Platform Admin routes */}
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
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="profile" element={<MyProfilePage />} />
          <Route index element={<Navigate to="tenants" replace />} />
        </Route>

        {/* ERP routes */}
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
          <Route path="transactions" element={guarded('transactions', <TransactionsPage />)} />
          <Route path="transactions/create" element={guarded('transactions', <TransactionFormPage />)} />
          <Route path="transactions/:id/edit" element={guarded('transactions', <TransactionFormPage />)} />
          <Route path="transactions/analytics" element={guarded('transactions', <TransactionAnalyticsPage />)} />
          <Route path="inventory" element={guarded('inventory', <InventoryPage />)} />
          <Route path="inventory/create" element={guarded('inventory', <InventoryFormPage />)} />
          <Route path="inventory/:id/edit" element={guarded('inventory', <InventoryFormPage />)} />
          <Route path="transportation" element={guarded('transportation', <TransportationPage />)} />
          <Route path="transportation/shipments" element={guarded('transportation', <ShipmentsPage />)} />
          <Route path="transportation/shipments/create" element={guarded('transportation', <ShipmentFormPage />)} />
          <Route path="transportation/shipments/:id" element={guarded('transportation', <ShipmentTrackingPage />)} />
          <Route path="transportation/couriers" element={guarded('transportation', <CouriersPage />)} />
          <Route path="accounting" element={guarded('accounting', <AccountingPage />)} />
          <Route path="hr" element={guarded('hr', <HRPage />)} />
          <Route path="crm" element={guarded('crm', <CRMPage />)} />
          <Route path="procurement" element={guarded('procurement', <ProcurementPage />)} />
          <Route path="warehouse" element={guarded('warehouse', <WarehousePage />)} />
          <Route path="projects" element={guarded('projects', <ProjectsPage />)} />
          <Route path="manufacturing" element={guarded('manufacturing', <ManufacturingPage />)} />
          <Route path="equipment" element={guarded('equipment', <AssetsPage />)} />
          <Route path="payments" element={guarded('payments', <PaymentsPage />)} />
          <Route path="communication" element={guarded('communication', <CommunicationPage />)} />
          <Route path="compliance" element={guarded('compliance', <CompliancePage />)} />
          <Route path="bi" element={guarded('bi', <BiReportingPage />)} />
          <Route path="documents" element={guarded('documents', <DocumentsPage />)} />
          <Route element={<TenantAdminRoute />}>
            <Route path="settings/subscription" element={<SubscriptionPage />} />
          </Route>
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route
          path="/portal"
          element={
            isAuthenticated
              ? (!isStaffUser ? <PortalHomePage /> : <Navigate to="/" replace />)
              : <Navigate to="/auth/login" replace />
          }
        />

        <Route path="/track/:trackingNumber" element={<ShipmentTrackingPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
