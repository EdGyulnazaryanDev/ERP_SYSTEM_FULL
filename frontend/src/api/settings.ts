import apiClient from './client';

export interface PageCatalogItem {
  key: string;
  name: string;
  path: string;
  category: string;
  requiredFeature?: string | null;
}

export interface PageAccessMatrixRow {
  page_key: string;
  page_name: string;
  page_path: string;
  category: string;
  required_feature: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  custom_permissions?: Record<string, unknown> | null;
}

export interface PageAccessPermissionSet {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

export const settingsApi = {
  getPageCatalog: () =>
    apiClient.get<PageCatalogItem[]>('/settings/page-access/catalog'),

  getMyPageAccess: () =>
    apiClient.get<PageAccessMatrixRow[]>('/settings/page-access/me'),

  getRolePageAccessMatrix: (roleId: string) =>
    apiClient.get<PageAccessMatrixRow[]>(
      `/settings/page-access/role/${roleId}/matrix`,
    ),

  initializeRolePageAccess: (roleId: string, isAdmin = false) =>
    apiClient.post(`/settings/page-access/role/${roleId}/initialize`, {
      isAdmin,
    }),

  bulkSetRolePageAccess: (
    roleId: string,
    accessList: Array<{
      page_key: string;
      permissions: Partial<PageAccessPermissionSet>;
    }>,
  ) =>
    apiClient.post(`/settings/page-access/role/${roleId}/bulk`, {
      accessList,
    }),
};
