import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Spin } from 'antd';

/**
 * Protects routes that only tenant admins (admin/superadmin role) can access.
 * System admins are redirected away since they don't belong to a tenant.
 */
export default function TenantAdminRoute() {
  const { user } = useAuthStore();
  const { isPrivilegedUser, isLoading } = useAccessControl();

  // System admins don't have a tenant context
  if (user?.isSystemAdmin) {
    return <Navigate to="/admin/tenants" replace />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isPrivilegedUser) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
