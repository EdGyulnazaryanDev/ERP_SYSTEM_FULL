export declare const KAFKA_TOPICS: {
    readonly INVENTORY_STOCK_CHANGED: "erp.inventory.stock-changed";
    readonly INVENTORY_LOW_STOCK_ALERT: "erp.inventory.low-stock-alert";
    readonly INVENTORY_STOCK_RESERVED: "erp.inventory.stock-reserved";
    readonly PROCUREMENT_REQUISITION_APPROVED: "erp.procurement.requisition-approved";
    readonly PROCUREMENT_PO_APPROVED: "erp.procurement.po-approved";
    readonly PROCUREMENT_PO_CANCELLED: "erp.procurement.po-cancelled";
    readonly PROCUREMENT_GOODS_RECEIVED: "erp.procurement.goods-received";
    readonly ACCOUNTING_INVOICE_CREATED: "erp.accounting.invoice-created";
    readonly ACCOUNTING_PAYMENT_RECORDED: "erp.accounting.payment-recorded";
    readonly ACCOUNTING_AP_BILL_CREATED: "erp.accounting.ap-bill-created";
    readonly ACCOUNTING_JOURNAL_POSTED: "erp.accounting.journal-posted";
    readonly HR_PAYROLL_PROCESSED: "erp.hr.payroll-processed";
    readonly CRM_OPPORTUNITY_WON: "erp.crm.opportunity-won";
    readonly TRANSPORTATION_SHIPMENT_DELIVERED: "erp.transportation.shipment-delivered";
    readonly DLQ_INVENTORY: "erp.inventory.dlq";
    readonly DLQ_PROCUREMENT: "erp.procurement.dlq";
    readonly DLQ_ACCOUNTING: "erp.accounting.dlq";
    readonly BRAINS_REQUESTS: "erp.brains.requests";
    readonly BRAINS_PLAYS: "erp.brains.plays";
    readonly BRAINS_APPROVAL_REQUIRED: "erp.brains.approval-required";
    readonly BRAINS_STEP_APPROVED: "erp.brains.step-approved";
    readonly BRAINS_STEP_COMPLETED: "erp.brains.step-completed";
    readonly BRAINS_STEP_FAILED: "erp.brains.step-failed";
    readonly BRAINS_CHAIN_COMPLETED: "erp.brains.chain-completed";
};
export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
//# sourceMappingURL=kafka-topics.d.ts.map