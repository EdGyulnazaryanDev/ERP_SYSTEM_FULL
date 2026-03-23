export interface Warehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  location: string;
  manager_name: string;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bin {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  bin_code: string;
  zone: string;
  aisle: string;
  rack: string;
  level: string;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  movement_number: string;
  product_id: string;
  product_name: string;
  movement_type: MovementType;
  from_location: string;
  to_location: string;
  quantity: number;
  movement_date: string;
  reference_document: string;
  notes: string;
  created_at: string;
  updated_at: string;
}
