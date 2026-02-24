import apiClient from './client';

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  parent?: Category;
  children?: Category[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  is_active?: boolean;
  sort_order?: number;
}

export const categoriesApi = {
  getAll: () => apiClient.get<Category[]>('/categories'),

  getTree: () => apiClient.get<Category[]>('/categories/tree'),

  getOne: (id: string) => apiClient.get<Category>(`/categories/${id}`),

  create: (data: CreateCategoryDto) =>
    apiClient.post<Category>('/categories', data),

  update: (id: string, data: UpdateCategoryDto) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};
