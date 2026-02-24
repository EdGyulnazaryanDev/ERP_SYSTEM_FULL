import { BaseService } from './BaseService';
import type { ModuleDefinition } from '@/types';

class ModuleService extends BaseService<ModuleDefinition> {
  constructor() {
    super('/modules');
  }

  async validateSchema(schema: Partial<ModuleDefinition>) {
    return this.client.post(`${this.baseUrl}/validate-schema`, schema);
  }

  async duplicateModule(id: string, newName: string) {
    return this.client.post(`${this.baseUrl}/${id}/duplicate`, { newName });
  }

  async getModuleStats(id: string) {
    return this.client.get(`${this.baseUrl}/${id}/stats`);
  }

  private get client() {
    return require('@/api/client').default;
  }
}

export const moduleService = new ModuleService();
