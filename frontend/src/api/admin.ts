import apiClient from './client';
import type { BillingCycle } from './subscriptions';

export interface TenantRecord {
  id: string;
  name: string;
  domain: string | null;
  isActive: boolean;
  createdAt: string;
  planName: string | null;
}

export interface TenantStats {
  tenant: TenantRecord;
  userCount: number;
  activityCount: number;
  recentUsers: { id: string; email: string; name: string; isActive: boolean; createdAt: string }[];
}

export const adminTenantsApi = {
  list: (params?: { page?: number; limit?: number; name?: string; isActive?: boolean }) =>
    apiClient.get<{ data: TenantRecord[]; total: number; page: number; limit: number }>('/admin/tenants', { params }),

  create: (body: { name: string; domain?: string }) =>
    apiClient.post<TenantRecord>('/admin/tenants', body),

  update: (id: string, body: { name?: string; domain?: string }) =>
    apiClient.patch<TenantRecord>(`/admin/tenants/${id}`, body),

  deactivate: (id: string) =>
    apiClient.patch<{ message: string; id: string }>(`/admin/tenants/${id}/deactivate`),

  activate: (id: string) =>
    apiClient.patch<{ message: string; id: string }>(`/admin/tenants/${id}/activate`),

  delete: (id: string) =>
    apiClient.delete<{ message: string; id: string }>(`/admin/tenants/${id}`),

  stats: (id: string) =>
    apiClient.get<TenantStats>(`/admin/tenants/${id}/stats`),

  impersonate: (tenantId: string) =>
    apiClient.post<{ accessToken: string; tenantName: string; userEmail: string }>(`/admin/impersonate/${tenantId}`),

  seedCoa: (tenantId: string) =>
    apiClient.post<{ message: string }>(`/admin/tenants/${tenantId}/seed-coa`),
};

export const adminSubscriptionsApi = {
  assignPlan: (tenantId: string, body: { planCode: string; billingCycle: BillingCycle; autoRenew?: boolean }) =>
    apiClient.patch(`/admin/subscriptions/tenants/${tenantId}/plan`, body),
};

export const adminSettingsApi = {
  get: () => apiClient.get<Record<string, string>>('/admin/settings'),
  update: (body: Record<string, string>) => apiClient.patch<Record<string, string>>('/admin/settings', body),
};

export const adminActivityLogApi = {
  list: () => apiClient.get<any[]>('/admin/activity-log'),
};
