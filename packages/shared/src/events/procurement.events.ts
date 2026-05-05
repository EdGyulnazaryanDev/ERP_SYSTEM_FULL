export const PROCUREMENT_EVENTS = {
  REQUISITION_APPROVED: 'erp.procurement.requisition-approved',
  PO_APPROVED: 'erp.procurement.po-approved',
  PO_CANCELLED: 'erp.procurement.po-cancelled',
  GOODS_RECEIVED: 'erp.procurement.goods-received',
} as const;

export interface GoodsReceivedPayload {
  goodsReceiptId: string;
  purchaseOrderId: string;
  supplierId: string;
  receiptDate: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantityReceived: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalAmount: number;
}

export interface POApprovedPayload {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  expectedDelivery: string;
}

export interface POCancelledPayload {
  purchaseOrderId: string;
  poNumber: string;
  reason: string;
}
