export declare const INVENTORY_EVENTS: {
    readonly STOCK_CHANGED: "erp.inventory.stock-changed";
    readonly LOW_STOCK_ALERT: "erp.inventory.low-stock-alert";
    readonly STOCK_RESERVED: "erp.inventory.stock-reserved";
};
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
//# sourceMappingURL=inventory.events.d.ts.map