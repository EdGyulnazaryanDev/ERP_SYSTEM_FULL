import { BaseService } from './BaseService';
import apiClient from '@/api/client';

export interface Report {
  id: string;
  name: string;
  moduleId: string;
  type: 'table' | 'chart' | 'pivot';
  config: Record<string, unknown>;
  createdAt: string;
}

class ReportService extends BaseService<Report> {
  constructor() {
    super('/reports');
  }

  async generate(reportId: string, params?: Record<string, unknown>) {
    return apiClient.post(`${this.baseUrl}/${reportId}/generate`, params);
  }

  async schedule(reportId: string, schedule: { cron: string; recipients: string[] }) {
    return apiClient.post(`${this.baseUrl}/${reportId}/schedule`, schedule);
  }

  async getSchedules(reportId: string) {
    return apiClient.get(`${this.baseUrl}/${reportId}/schedules`);
  }
}

export const reportService = new ReportService();
