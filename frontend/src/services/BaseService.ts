import apiClient from '@/api/client';
import type { AxiosResponse } from 'axios';

export interface FilterOperator {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: unknown;
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface QueryParams extends PaginationParams {
  filters?: FilterOperator[];
  sort?: SortOption[];
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class BaseService<T = unknown> {
  constructor(protected baseUrl: string) {}

  protected buildQueryString(params: Partial<QueryParams>): string {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.search) queryParams.append('search', params.search);

    if (params.filters && params.filters.length > 0) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }

    if (params.sort && params.sort.length > 0) {
      queryParams.append('sort', JSON.stringify(params.sort));
    }

    return queryParams.toString();
  }

  async getAll(params?: Partial<QueryParams>): Promise<AxiosResponse<PaginatedResponse<T>>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<T>>(`${this.baseUrl}?${queryString}`);
  }

  async getById(id: string | number): Promise<AxiosResponse<T>> {
    return apiClient.get<T>(`${this.baseUrl}/${id}`);
  }

  async create(data: Partial<T>): Promise<AxiosResponse<T>> {
    return apiClient.post<T>(this.baseUrl, data);
  }

  async update(id: string | number, data: Partial<T>): Promise<AxiosResponse<T>> {
    return apiClient.put<T>(`${this.baseUrl}/${id}`, data);
  }

  async patch(id: string | number, data: Partial<T>): Promise<AxiosResponse<T>> {
    return apiClient.patch<T>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string | number): Promise<AxiosResponse<void>> {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async bulkDelete(ids: (string | number)[]): Promise<AxiosResponse<void>> {
    return apiClient.post(`${this.baseUrl}/bulk-delete`, { ids });
  }

  async export(params?: Partial<QueryParams>, format: 'csv' | 'xlsx' = 'csv'): Promise<AxiosResponse<Blob>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return apiClient.get(`${this.baseUrl}/export?format=${format}&${queryString}`, {
      responseType: 'blob',
    });
  }
}
