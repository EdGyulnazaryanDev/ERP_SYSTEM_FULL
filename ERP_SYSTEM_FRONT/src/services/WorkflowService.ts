import { BaseService } from './BaseService';
import apiClient from '@/api/client';
import type { WorkflowRule } from '@/types';

class WorkflowService extends BaseService<WorkflowRule> {
  constructor() {
    super('/workflows');
  }

  async execute(workflowId: string, data: Record<string, unknown>) {
    return apiClient.post(`${this.baseUrl}/${workflowId}/execute`, data);
  }

  async getExecutionHistory(workflowId: string) {
    return apiClient.get(`${this.baseUrl}/${workflowId}/history`);
  }

  async validateRule(rule: Partial<WorkflowRule>) {
    return apiClient.post(`${this.baseUrl}/validate`, rule);
  }

  async toggleActive(workflowId: string, active: boolean) {
    return apiClient.patch(`${this.baseUrl}/${workflowId}/toggle`, { active });
  }
}

export const workflowService = new WorkflowService();
