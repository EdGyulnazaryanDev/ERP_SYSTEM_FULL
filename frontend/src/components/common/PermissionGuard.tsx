import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: string;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  children,
  requiredPermission,
  fallback = null,
}: PermissionGuardProps) {
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.trim().toLowerCase().replace(/[\s_-]+/g, '');

  // Check if user has the required permission
  const hasPermission =
    normalizedRole === 'admin'
    || normalizedRole === 'superadmin'
    || user?.role === requiredPermission;

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
