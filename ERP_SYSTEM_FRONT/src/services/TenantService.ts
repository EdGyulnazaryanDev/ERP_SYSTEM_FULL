import { BaseService } from './BaseService';
import apiClient from '@/api/client';
import type { Tenant } from '@/types';

class TenantService extends BaseService<Tenant> {
  constructor() {
    super('/tenants');
  }

  async getCurrentTenant() {
    return apiClient.get<Tenant>('/tenants/current');
  }

  async updateSettings(settings: Record<string, unknown>) {
    return apiClient.put('/tenants/settings', settings);
  }

  async getUsageStats() {
    return apiClient.get('/tenants/usage-stats');
  }

  async inviteUser(email: string, role: string) {
    return apiClient.post('/tenants/invite', { email, role });
  }
}

export const tenantService = new TenantService();
