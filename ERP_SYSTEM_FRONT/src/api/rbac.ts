import apiClient from './client';

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  tenant_id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const rbacApi = {
  // Roles
  getRoles: () => apiClient.get<Role[]>('/rbac/roles'),
  
  createRole: (data: { name: string; description?: string }) =>
    apiClient.post<Role>('/rbac/roles', data),
  
  updateRole: (id: string, data: { name?: string; description?: string }) =>
    apiClient.put<Role>(`/rbac/roles/${id}`, data),
  
  deleteRole: (id: string) =>
    apiClient.delete(`/rbac/roles/${id}`),

  // Permissions
  getPermissions: () => apiClient.get<Permission[]>('/rbac/permissions'),
  
  createPermission: (data: {
    name: string;
    resource: string;
    action: string;
    description?: string;
  }) => apiClient.post<Permission>('/rbac/permissions', data),
  
  updatePermission: (
    id: string,
    data: {
      name?: string;
      resource?: string;
      action?: string;
      description?: string;
    },
  ) => apiClient.put<Permission>(`/rbac/permissions/${id}`, data),
  
  deletePermission: (id: string) =>
    apiClient.delete(`/rbac/permissions/${id}`),

  // Role-Permission Assignment
  getRolePermissions: (roleId: string) =>
    apiClient.get<Permission[]>(`/rbac/roles/${roleId}/permissions`),
  
  assignPermissions: (roleId: string, permissionIds: string[]) =>
    apiClient.post(`/rbac/roles/${roleId}/permissions`, { permissionIds }),
};
