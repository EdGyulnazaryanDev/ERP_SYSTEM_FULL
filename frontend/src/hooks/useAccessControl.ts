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

  // Check JWT role as fast-path fallback (covers fresh tenants with no user_roles rows yet)
  const jwtRoleNormalized = user?.role ? normalizeRoleName(user.role) : '';
  const isJwtPrivileged = jwtRoleNormalized === 'admin' || jwtRoleNormalized === 'superadmin';

  // isPrivilegedUser: bypasses RBAC page-access checks only (not subscription gating)
  const isPrivilegedUser = isSystemAdmin || isJwtPrivileged || userRoles.some((role) => {
    const normalizedName = normalizeRoleName(role.name);
    return normalizedName === 'superadmin' || normalizedName === 'admin';
  });

  const getPageAccess = (pageKey: string) => pageAccessMap.get(pageKey);

  const canAccessPage = (pageKey: string) => {
    if (isSystemAdmin) return true;
    // No subscription — only settings is accessible
    if (!subscription) return pageKey === 'settings';

    // If the page isn't in the catalog at all, it's not allowed by the plan
    if (!pageCatalogMap.has(pageKey)) return false;

    // Subscription feature gate: check requiredFeature against plan features
    const page = pageCatalogMap.get(pageKey);
    if (page?.requiredFeature && !enabledFeatures.includes(page.requiredFeature as any)) {
      return false;
    }

    // RBAC check — privileged users (admin/superadmin) bypass role-based page restrictions
    if (isPrivilegedUser) return true;

    const access = pageAccessMap.get(pageKey);
    return access?.can_view ?? false;
  };

  const canPerform = (pageKey: string, action: PageAction) => {
    if (isSystemAdmin) return true;
    if (isPrivilegedUser) return true;

    const access = getPageAccess(pageKey);
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
    if (isSystemAdmin) return false;
    // No subscription — everything locked except settings
    if (!subscription) return pageKey !== 'settings';
    // If page not in catalog, it's locked by plan
    if (!pageCatalogMap.has(pageKey)) return true;
    // Subscription gating applies to ALL tenant users
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
