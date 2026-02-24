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

  // Check if user has the required permission
  const hasPermission = user?.role === 'admin' || 
    user?.role === requiredPermission;

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
