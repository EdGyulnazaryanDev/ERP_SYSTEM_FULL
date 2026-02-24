import apiClient from './client';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  cost_price: number | string;
  selling_price: number | string;
  tax_rate?: number | string;
  quantity_in_stock: number;
  reorder_level: number;
  unit_of_measure?: string;
  supplier?: string;
  is_active: boolean;
  image_url?: string;
  attributes?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductStats {
  total_products: number;
  total_stock_value: number;
  active_products: number;
  low_stock_count: number;
}

export const productsApi = {
  // List products
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    supplier?: string;
    is_active?: boolean;
    search?: string;
  }) =>
    apiClient.get<ProductListResponse>('/products', { params }),

  // Get single product
  getProduct: (id: string) =>
    apiClient.get<Product>(`/products/${id}`),

  // Create product
  createProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) =>
    apiClient.post<Product>('/products', data),

  // Update product
  updateProduct: (
    id: string,
    data: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>,
  ) => apiClient.put<Product>(`/products/${id}`, data),

  // Delete product
  deleteProduct: (id: string) =>
    apiClient.delete(`/products/${id}`),

  // Bulk delete products
  bulkDeleteProducts: (ids: string[]) =>
    apiClient.post('/products/bulk-delete', { ids }),

  // Get categories
  getCategories: () =>
    apiClient.get<string[]>('/products/categories'),

  // Get suppliers
  getSuppliers: () =>
    apiClient.get<string[]>('/products/suppliers'),

  // Get low stock products
  getLowStockProducts: () =>
    apiClient.get<Product[]>('/products/low-stock'),

  // Get product statistics
  getProductStats: () =>
    apiClient.get<ProductStats>('/products/stats'),
};


