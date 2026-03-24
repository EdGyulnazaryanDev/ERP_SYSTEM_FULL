import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { rbacApi } from '@/api/rbac';
import { subscriptionsApi } from '@/api/subscriptions';
import { useAuthStore } from '@/store/authStore';

type PageAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

function normalizeRoleName(name: string) {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function useAccessControl() {
  const { user, isAuthenticated } = useAuthStore();

  const { data: pageAccess = [], isLoading: isPageAccessLoading } = useQuery({
    queryKey: ['my-page-access'],
    queryFn: async () => {
      const response = await settingsApi.getMyPageAccess();
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const { data: pageCatalog = [], isLoading: isCatalogLoading } = useQuery({
    queryKey: ['page-catalog'],
    queryFn: async () => {
      const response = await settingsApi.getPageCatalog();
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const response = await subscriptionsApi.getCurrentSubscription();
      console.log('📦 Subscription API Response:', response.data);
      // Handle null, undefined, empty string, or empty object
      const data = response.data;
      if (!data || data === '' || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return null;
      }
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: userRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      const response = await rbacApi.getUserRoles(user!.id);
      return response.data;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const pageAccessMap = useMemo(
    () => new Map(pageAccess.map((item) => [item.page_key, item])),
    [pageAccess],
  );

  const pageCatalogMap = useMemo(
    () => new Map(pageCatalog.map((item) => [item.key, item])),
    [pageCatalog],
  );

  const enabledFeatures = subscription?.plan?.features ?? [];
  const isSystemAdmin = user?.isSystemAdmin === true;
  // System admin, superadmin, and tenant Admin role bypass all restrictions
  const isPrivilegedUser = isSystemAdmin || userRoles.some((role) => {
    const normalizedName = normalizeRoleName(role.name);
    return normalizedName === 'superadmin' || normalizedName === 'admin';
  });

  const getPageAccess = (pageKey: string) => pageAccessMap.get(pageKey);

  const canAccessPage = (pageKey: string) => {
    if (isSystemAdmin) return true;
    // No subscription — only settings is accessible
    if (!subscription) return pageKey === 'settings';
    if (isPrivilegedUser) return true;

    const page = pageCatalogMap.get(pageKey);
    const access = pageAccessMap.get(pageKey);

    // Feature gate check
    const featureAllowed = !page?.requiredFeature
      || enabledFeatures.includes(page.requiredFeature as any);

    // No access row → deny
    const canView = access?.can_view ?? false;

    return canView && featureAllowed;
  };

  const canPerform = (pageKey: string, action: PageAction) => {
    // system admin can do everything
    if (isSystemAdmin) return true;
    // superadmin bypasses all restrictions
    if (isPrivilegedUser) return true;

    const access = getPageAccess(pageKey);

    // No access row configured → deny by default for non-privileged users
    if (!access) return false;

    switch (action) {
      case 'view':   return access.can_view   ?? false;
      case 'create': return access.can_create ?? false;
      case 'edit':   return access.can_edit   ?? false;
      case 'delete': return access.can_delete ?? false;
      case 'export': return access.can_export ?? false;
      default:       return false;
    }
  };

  const isLockedBySubscription = (pageKey: string): boolean => {
    // No subscription at all — everything is locked except settings
    if (!subscription) return pageKey !== 'settings';
    if (isPrivilegedUser) return false;
    const page = pageCatalogMap.get(pageKey);
    if (!page?.requiredFeature) return false;
    return !enabledFeatures.includes(page.requiredFeature as any);
  };

  return {
    user,
    pageAccess,
    pageCatalog,
    subscription,
    userRoles,
    isPrivilegedUser,
    getPageAccess,
    canAccessPage,
    canPerform,
    isLockedBySubscription,
    isLoading:
      isPageAccessLoading
      || isCatalogLoading
      || isSubscriptionLoading
      || isRolesLoading,
  };
}
