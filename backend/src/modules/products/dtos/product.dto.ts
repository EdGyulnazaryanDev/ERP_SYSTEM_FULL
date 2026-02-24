export interface CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  category?: string;
  cost_price: number;
  selling_price: number;
  tax_rate?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  unit_of_measure?: string;
  supplier?: string;
  image_url?: string;
  attributes?: Record<string, any>;
}

export interface UpdateProductDto {
  name?: string;
  sku?: string;
  description?: string;
  category?: string;
  cost_price?: number;
  selling_price?: number;
  tax_rate?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  unit_of_measure?: string;
  supplier?: string;
  is_active?: boolean;
  image_url?: string;
  attributes?: Record<string, any>;
}

export interface ProductResponse {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  cost_price: number;
  selling_price: number;
  tax_rate?: number;
  quantity_in_stock: number;
  reorder_level: number;
  unit_of_measure?: string;
  supplier?: string;
  is_active: boolean;
  image_url?: string;
  attributes?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProductListResponse {
  data: ProductResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  category?: string;
  supplier?: string;
  is_active?: boolean;
  search?: string;
}
