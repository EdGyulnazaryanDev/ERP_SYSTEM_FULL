export declare const ACCOUNTING_EVENTS: {
    readonly INVOICE_CREATED: "erp.accounting.invoice-created";
    readonly PAYMENT_RECORDED: "erp.accounting.payment-recorded";
    readonly AP_BILL_CREATED: "erp.accounting.ap-bill-created";
    readonly JOURNAL_POSTED: "erp.accounting.journal-posted";
};
export interface PaymentRecordedPayload {
    paymentId: string;
    paymentNumber: string;
    amount: number;
    paymentMethod: string;
    referenceId: string;
    referenceType: 'ar' | 'ap';
    paymentDate: string;
}
export interface InvoiceCreatedPayload {
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    amount: number;
    dueDate: string;
}
export interface APBillCreatedPayload {
    billId: string;
    billNumber: string;
    supplierId: string;
    amount: number;
    dueDate: string;
    sourceType: 'goods_receipt' | 'manual';
    sourceId: string;
}
//# sourceMappingURL=accounting.events.d.ts.map