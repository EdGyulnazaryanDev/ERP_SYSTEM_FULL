import apiClient from '@/api/client';

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

export interface CreatePermissionDto {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

class PermissionService {
  private baseUrl = '/permissions';

  async getAll() {
    return apiClient.get<Permission[]>(this.baseUrl);
  }

  async getById(id: string) {
    return apiClient.get<Permission>(`${this.baseUrl}/${id}`);
  }

  async create(data: CreatePermissionDto) {
    return apiClient.post<Permission>(this.baseUrl, data);
  }

  async update(id: string, data: Partial<CreatePermissionDto>) {
    return apiClient.patch<Permission>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async assignToRole(roleId: string, permissionIds: string[]) {
    return apiClient.post(`${this.baseUrl}/roles/${roleId}/assign`, {
      permissionIds,
    });
  }

  async getRolePermissions(roleId: string) {
    return apiClient.get<Permission[]>(`${this.baseUrl}/roles/${roleId}`);
  }

  async getUserPermissions(userId: string) {
    return apiClient.get<Permission[]>(`${this.baseUrl}/users/${userId}`);
  }
}

export const permissionService = new PermissionService();
