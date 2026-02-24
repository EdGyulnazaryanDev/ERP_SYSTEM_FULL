import apiClient from '@/api/client';
import type { Role } from './RoleService';
import type { Permission } from './PermissionService';

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
  role_name?: string;
  permission_name?: string;
}

export interface AssignPermissionToRoleDto {
  permissionId: string;
}

class RolePermissionService {
  private baseUrl = '/role-permissions';

  async getAll() {
    return apiClient.get<RolePermission[]>(this.baseUrl);
  }

  async getByRole(roleId: string) {
    return apiClient.get<Permission[]>(`${this.baseUrl}/role/${roleId}`);
  }

  async getByPermission(permissionId: string) {
    return apiClient.get<Role[]>(`${this.baseUrl}/permission/${permissionId}`);
  }

  async assignPermissionToRole(roleId: string, permissionId: string) {
    return apiClient.post<RolePermission>(
      `${this.baseUrl}/role/${roleId}/permission`,
      { permissionId }
    );
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    return apiClient.delete(
      `${this.baseUrl}/role/${roleId}/permission/${permissionId}`
    );
  }

  async removeAllPermissionsFromRole(roleId: string) {
    return apiClient.delete(`${this.baseUrl}/role/${roleId}`);
  }
}

export const rolePermissionService = new RolePermissionService();
