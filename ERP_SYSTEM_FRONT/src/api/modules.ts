import apiClient from './client';

export interface ModuleField {
  name: string;
  displayName: string;
  type: 'text' | 'longtext' | 'number' | 'integer' | 'decimal' | 'date' | 'datetime' | 'boolean' | 'email' | 'phone' | 'url' | 'select';
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[];
  description?: string;
}

export interface ModuleDefinition {
  id: string;
  tenant_id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: ModuleField[];
  tableCreated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleDataResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
}

export const modulesApi = {
  // Module Definitions
  getModules: () =>
    apiClient.get<ModuleDefinition[]>('/dynamic-modules'),

  getModule: (id: string) =>
    apiClient.get<ModuleDefinition>(`/dynamic-modules/${id}`),

  createModule: (data: {
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
    color?: string;
    fields: ModuleField[];
  }) =>
    apiClient.post<ModuleDefinition>('/dynamic-modules', data),

  updateModule: (id: string, data: {
    displayName?: string;
    description?: string;
    icon?: string;
    color?: string;
  }) =>
    apiClient.put<ModuleDefinition>(`/dynamic-modules/${id}`, data),

  deleteModule: (id: string) =>
    apiClient.delete(`/dynamic-modules/${id}`),

  // Module Data (Records)
  getModuleData: (moduleName: string, params?: {
    page?: number;
    limit?: number;
    [key: string]: any;
  }) =>
    apiClient.get<ModuleDataResponse>(`/dynamic-modules/${moduleName}/data`, { params }),

  getModuleRecord: (moduleName: string, recordId: string) =>
    apiClient.get<any>(`/dynamic-modules/${moduleName}/data/${recordId}`),

  createModuleRecord: (moduleName: string, data: Record<string, any>) =>
    apiClient.post<any>(`/dynamic-modules/${moduleName}/data`, data),

  updateModuleRecord: (moduleName: string, recordId: string, data: Record<string, any>) =>
    apiClient.put<any>(`/dynamic-modules/${moduleName}/data/${recordId}`, data),

  deleteModuleRecord: (moduleName: string, recordId: string) =>
    apiClient.delete(`/dynamic-modules/${moduleName}/data/${recordId}`),

  bulkDeleteRecords: (moduleName: string, ids: string[]) =>
    apiClient.post(`/dynamic-modules/${moduleName}/data/bulk-delete`, { ids }),
};
