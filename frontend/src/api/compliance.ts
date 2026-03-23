import apiClient from '@/api/client';

export type AuditStatistics = {
  total_logs: number;
  by_action: Record<string, number>;
  by_severity: Record<string, number>;
  by_entity_type: Record<string, number>;
  by_user: Record<string, number>;
};

export type ComplianceRuleRow = {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string;
  rule_type: string;
  framework: string;
  status: string;
  priority: number;
  auto_check: boolean;
  check_frequency?: string;
  effective_date?: string;
  expiry_date?: string;
  updated_at: string;
};

export type ComplianceCheckRow = {
  id: string;
  status: string;
  trigger: string;
  result_message?: string;
  violations_count: number;
  execution_time_ms?: number;
  checked_at: string;
  rule?: {
    id: string;
    rule_code?: string;
    rule_name?: string;
    framework?: string;
  };
};

export type RetentionPolicyRow = {
  id: string;
  policy_name: string;
  description: string;
  entity_type: string;
  retention_days: number;
  action: string;
  status: string;
  auto_execute: boolean;
  execution_schedule?: string;
  last_executed_at?: string;
  records_processed: number;
  updated_at: string;
};

export type ComplianceReportRow = {
  id: string;
  report_name: string;
  report_type: string;
  framework?: string;
  status: string;
  start_date: string;
  end_date: string;
  generated_at: string;
  summary?: Record<string, unknown>;
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
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
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

  getRules: () => apiClient.get<ComplianceRuleRow[]>('/compliance-audit/rules'),

  getChecks: () => apiClient.get<ComplianceCheckRow[]>('/compliance-audit/checks'),

  getPolicies: () => apiClient.get<RetentionPolicyRow[]>('/compliance-audit/policies'),

  getReports: () => apiClient.get<ComplianceReportRow[]>('/compliance-audit/reports'),

  getAuditStatistics: (startDate: string, endDate: string) =>
    apiClient.get<AuditStatistics>('/compliance-audit/audit-logs/statistics', {
      params: { start_date: startDate, end_date: endDate },
    }),
};
