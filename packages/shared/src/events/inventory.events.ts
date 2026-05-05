export const INVENTORY_EVENTS = {
  STOCK_CHANGED: 'erp.inventory.stock-changed',
  LOW_STOCK_ALERT: 'erp.inventory.low-stock-alert',
  STOCK_RESERVED: 'erp.inventory.stock-reserved',
} as const;

export interface StockChangedPayload {
  inventoryId: string;
  sku: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  changeType: 'increase' | 'decrease' | 'adjustment';
  reference: string;
}

export interface LowStockAlertPayload {
  inventoryId: string;
  sku: string;
  productName: string;
  currentQuantity: number;
  reorderPoint: number;
}

export interface StockReservedPayload {
  inventoryId: string;
  sku: string;
  reservedQuantity: number;
  orderId: string;
}
