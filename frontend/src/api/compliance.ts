import apiClient from '@/api/client';

export type AuditStatistics = {
  total_logs: number;
  by_action: Record<string, number>;
  by_severity: Record<string, number>;
  by_entity_type: Record<string, number>;
  by_user: Record<string, number>;
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  severity: string;
  description?: string;
  created_at: string;
  user?: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
};

export type AccessLogRow = {
  id: string;
  access_type: string;
  resource_type: string;
  resource_id?: string;
  result: string;
  ip_address?: string;
  accessed_at: string;
  user?: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
};

export const complianceApi = {
  getAuditLogs: () => apiClient.get<AuditLogRow[]>('/compliance-audit/audit-logs'),

  getAccessLogs: () => apiClient.get<AccessLogRow[]>('/compliance-audit/access-logs'),

  getAuditStatistics: (startDate: string, endDate: string) =>
    apiClient.get<AuditStatistics>('/compliance-audit/audit-logs/statistics', {
      params: { start_date: startDate, end_date: endDate },
    }),
};
