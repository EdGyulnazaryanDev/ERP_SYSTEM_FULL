import { BaseService } from './BaseService';
import apiClient from '@/api/client';
import type { ModuleInstance } from '@/types';

export class ModuleDataService extends BaseService<ModuleInstance> {
  constructor(moduleId: string) {
    super(`/modules/${moduleId}/data`);
  }

  async bulkCreate(records: Record<string, unknown>[]) {
    return apiClient.post(`${this.baseUrl}/bulk`, { records });
  }

  async bulkUpdate(updates: Array<{ id: string; data: Record<string, unknown> }>) {
    return apiClient.put(`${this.baseUrl}/bulk`, { updates });
  }

  async import(file: File, mapping: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    return apiClient.post(`${this.baseUrl}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async getHistory(recordId: string) {
    return apiClient.get(`${this.baseUrl}/${recordId}/history`);
  }

  async restore(recordId: string, version: number) {
    return apiClient.post(`${this.baseUrl}/${recordId}/restore`, { version });
  }
}

export const createModuleDataService = (moduleId: string) => new ModuleDataService(moduleId);
