import apiClient from './client';

export interface Inventory {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit_cost: number;
  unit_price: number;
  reorder_level: number;
  reorder_quantity?: number;
  max_stock_level: number;
  supplier_id?: string;
  supplier_name?: string;
  location?: string;
  warehouse?: string;
  created_at: string;
  updated_at: string;
}

export interface StockSummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export const inventoryApi = {
  getAll: () => apiClient.get<Inventory[]>('/inventory'),

  getOne: (id: string) => apiClient.get<Inventory>(`/inventory/${id}`),

  getLowStock: () => apiClient.get<Inventory[]>('/inventory/low-stock'),

  getSummary: () => apiClient.get<StockSummary>('/inventory/summary'),

  create: (data: Partial<Inventory>) =>
    apiClient.post<Inventory>('/inventory', data),

  update: (id: string, data: Partial<Inventory>) =>
    apiClient.put<Inventory>(`/inventory/${id}`, data),

  delete: (id: string) => apiClient.delete(`/inventory/${id}`),
};
