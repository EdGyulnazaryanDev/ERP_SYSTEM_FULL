import apiClient from '@/api/client';

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

class RoleService {
  private baseUrl = '/roles';

  async getAll() {
    return apiClient.get<Role[]>(this.baseUrl);
  }

  async getById(id: string) {
    return apiClient.get<Role>(`${this.baseUrl}/${id}`);
  }

  async create(data: CreateRoleDto) {
    return apiClient.post<Role>(this.baseUrl, data);
  }

  async update(id: string, data: Partial<CreateRoleDto>) {
    return apiClient.patch<Role>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async assignUsers(roleId: string, userIds: string[]) {
    return apiClient.post(`${this.baseUrl}/${roleId}/users`, { userIds });
  }

  async getRoleUsers(roleId: string) {
    return apiClient.get(`${this.baseUrl}/${roleId}/users`);
  }

  async getUserRoles(userId: string) {
    return apiClient.get(`${this.baseUrl}/users/${userId}`);
  }

  async assignRoleToUser(roleId: string, userId: string) {
    return apiClient.post(`${this.baseUrl}/${roleId}/users/${userId}`);
  }

  async removeRoleFromUser(roleId: string, userId: string) {
    return apiClient.delete(`${this.baseUrl}/${roleId}/users/${userId}`);
  }
}

export const roleService = new RoleService();
