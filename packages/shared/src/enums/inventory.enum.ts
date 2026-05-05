export enum MovementType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
}

export enum MovementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}
