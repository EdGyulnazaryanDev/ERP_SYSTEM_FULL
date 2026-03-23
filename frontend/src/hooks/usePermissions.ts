import { useAuthStore } from '@/store/authStore';

function isPrivilegedRole(role?: string | null) {
  if (!role) return false;
  const normalizedName = role.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalizedName === 'admin' || normalizedName === 'superadmin';
}

export function usePermissions() {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (isPrivilegedRole(user.role)) return true;
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
  const isAdmin = isPrivilegedRole(user?.role);

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
