import apiClient from '@/api/client';

export type KpiResponse = {
  total_revenue: number;
  total_orders: number;
  active_customers: number;
  inventory_value: number;
};

export type TrendRow = {
  period: string;
  count: number;
  total: string | number;
};

export type ReportTemplate = {
  id: string;
  name: string;
  description?: string;
  category: string;
  query?: string;
  supported_formats: string[];
  is_active: boolean;
  is_system?: boolean;
};

export type SavedReport = {
  id: string;
  name: string;
  format: string;
  status: string;
  row_count: number;
  file_url?: string;
  file_path?: string;
  error_message?: string;
  generated_at?: string;
  created_at: string;
  template?: ReportTemplate;
};

export type Dashboard = {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  is_default: boolean;
  widgets?: DashboardWidget[];
};

export type DashboardWidget = {
  id: string;
  title: string;
  widget_type: string;
  chart_type?: string;
  query?: string;
  sort_order: number;
};

export type ExportLog = {
  id: string;
  export_type: string;
  entity_name: string;
  format: string;
  record_count: number;
  status: string;
  created_at: string;
};

export const biReportingApi = {
  getKpis: () => apiClient.get<KpiResponse>('/bi-reporting/analytics/kpis'),

  getTrends: (metric: string, period: 'daily' | 'weekly' | 'monthly') =>
    apiClient.get<TrendRow[]>('/bi-reporting/analytics/trends', {
      params: { metric, period },
    }),

  getTemplates: () => apiClient.get<ReportTemplate[]>('/bi-reporting/templates'),

  getTemplate: (id: string) => apiClient.get<ReportTemplate>(`/bi-reporting/templates/${id}`),

  createTemplate: (body: {
    name: string;
    description?: string;
    category: string;
    query: string;
    supported_formats?: string[];
  }) => apiClient.post<ReportTemplate>('/bi-reporting/templates', body),

  updateTemplate: (
    id: string,
    body: {
      name?: string;
      description?: string;
      category?: string;
      query?: string;
      is_active?: boolean;
    },
  ) => apiClient.put<ReportTemplate>(`/bi-reporting/templates/${id}`, body),

  deleteTemplate: (id: string) => apiClient.delete(`/bi-reporting/templates/${id}`),

  getSavedReports: () => apiClient.get<SavedReport[]>('/bi-reporting/reports'),

  generateReport: (body: {
    template_id: string;
    name: string;
    format: string;
    parameters?: Record<string, unknown>;
    filters?: Record<string, unknown>;
  }) => apiClient.post<SavedReport>('/bi-reporting/reports/generate', body),

  getExportLogs: () => apiClient.get<ExportLog[]>('/bi-reporting/exports/logs'),

  getDashboards: () => apiClient.get<Dashboard[]>('/bi-reporting/dashboards'),

  executeQuery: (body: { query: string; parameters?: unknown }) =>
    apiClient.post<Record<string, unknown>[]>('/bi-reporting/query/execute', body),

  getWidgetData: (widgetId: string) =>
    apiClient.get<unknown>(`/bi-reporting/widgets/${widgetId}/data`),
};
