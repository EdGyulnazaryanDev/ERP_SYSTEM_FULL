import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // Add more complex permission logic here
    return user.role === permission;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  const canRead = hasPermission('read');
  const canWrite = hasPermission('write');
  const canDelete = hasPermission('delete');
  const isAdmin = user?.role === 'admin';

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canRead,
    canWrite,
    canDelete,
    isAdmin,
  };
}
