export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  FULFILLED = 'fulfilled',
}

export enum RequisitionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum GoodsReceiptStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RfqStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum QuoteStatus {
  RECEIVED = 'received',
  SELECTED = 'selected',
  REJECTED = 'rejected',
}

export enum ItemQualityStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PARTIAL = 'partial',
}
