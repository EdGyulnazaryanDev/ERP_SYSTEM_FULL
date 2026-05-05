export declare const PROCUREMENT_EVENTS: {
    readonly REQUISITION_APPROVED: "erp.procurement.requisition-approved";
    readonly PO_APPROVED: "erp.procurement.po-approved";
    readonly PO_CANCELLED: "erp.procurement.po-cancelled";
    readonly GOODS_RECEIVED: "erp.procurement.goods-received";
};
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
//# sourceMappingURL=procurement.events.d.ts.map