// Central event definitions for the financial brain

export enum FinancialEventType {
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  BILL_CREATED = 'bill.created',
  BILL_PAID = 'bill.paid',
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_MADE = 'payment.made',
  STOCK_MOVED = 'stock.moved',
  SHIPMENT_DELIVERED = 'shipment.delivered',
  PURCHASE_ORDER_RECEIVED = 'purchase_order.received',
  PAYROLL_PROCESSED = 'payroll.processed',
  ASSET_DEPRECIATED = 'asset.depreciated',
}

export class InvoiceCreatedEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  date: string;
  description?: string;
}

export class BillCreatedEvent {
  tenantId: string;
  billId: string;
  billNumber: string;
  supplierId: string;
  amount: number;
  date: string;
  description?: string;
}

export class PaymentReceivedEvent {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  reference?: string;
}

export class PaymentMadeEvent {
  tenantId: string;
  billId: string;
  billNumber: string;
  amount: number;
  date: string;
  reference?: string;
}

export class StockMovedEvent {
  tenantId: string;
  productId: string;
  productName: string;
  quantity: number;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  unitCost: number;
  totalCost: number;
  reference?: string;
}

export class ShipmentDeliveredEvent {
  tenantId: string;
  shipmentId: string;
  trackingNumber: string;
  shippingCost: number;
  customerId?: string;
  date: string;
}

export class PurchaseOrderReceivedEvent {
  tenantId: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  items: Array<{ productId: string; quantity: number; unitCost: number }>;
  date: string;
}

export class PayrollProcessedEvent {
  tenantId: string;
  payslipId: string;
  employeeId: string;
  netAmount: number;
  date: string;
}
