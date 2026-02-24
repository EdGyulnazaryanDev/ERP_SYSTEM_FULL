import { BaseService } from './BaseService';
import apiClient from '@/api/client';
import type { User } from '@/types';

class UserService extends BaseService<User> {
  constructor() {
    super('/users');
  }

  async updateProfile(data: Partial<User>) {
    return apiClient.put('/users/profile', data);
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return apiClient.post('/users/change-password', { oldPassword, newPassword });
  }

  async assignRole(userId: string, role: string) {
    return apiClient.post(`${this.baseUrl}/${userId}/role`, { role });
  }

  async getPermissions(userId: string) {
    return apiClient.get(`${this.baseUrl}/${userId}/permissions`);
  }

  async updatePermissions(userId: string, permissions: string[]) {
    return apiClient.put(`${this.baseUrl}/${userId}/permissions`, { permissions });
  }
}

export const userService = new UserService();
