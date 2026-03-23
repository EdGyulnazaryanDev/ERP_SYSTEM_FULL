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
      return response.data;
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

  const enabledFeatures = subscription?.plan.features ?? [];
  const isPrivilegedUser = userRoles.some((role) => {
    const normalizedName = normalizeRoleName(role.name);
    return (
      normalizedName === 'admin'
      || normalizedName === 'superadmin'
      || (role.is_system && normalizedName.includes('admin'))
    );
  });

  const getPageAccess = (pageKey: string) => pageAccessMap.get(pageKey);

  const canAccessPage = (pageKey: string) => {
    const page = pageCatalogMap.get(pageKey);
    const access = pageAccessMap.get(pageKey);

    const canView = access?.can_view ?? true;
    const featureAllowed = isPrivilegedUser
      ? true
      : !page?.requiredFeature
        || enabledFeatures.includes(page.requiredFeature as any);

    return canView && featureAllowed;
  };

  const canPerform = (pageKey: string, action: PageAction) => {
    if (!canAccessPage(pageKey)) {
      return false;
    }

    const access = getPageAccess(pageKey);

    switch (action) {
      case 'view':
        return access?.can_view ?? true;
      case 'create':
        return access?.can_create ?? true;
      case 'edit':
        return access?.can_edit ?? true;
      case 'delete':
        return access?.can_delete ?? true;
      case 'export':
        return access?.can_export ?? true;
      default:
        return false;
    }
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
    isLoading:
      isPageAccessLoading
      || isCatalogLoading
      || isSubscriptionLoading
      || isRolesLoading,
  };
}
