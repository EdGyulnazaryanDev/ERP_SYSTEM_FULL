"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainStepStatus = exports.BrainExecutionStatus = exports.BrainChainTemplate = exports.BrainStepType = void 0;
var BrainStepType;
(function (BrainStepType) {
    BrainStepType["CREATE_REQUISITION"] = "CREATE_REQUISITION";
    BrainStepType["CREATE_RFQ"] = "CREATE_RFQ";
    BrainStepType["SELECT_SUPPLIER_QUOTE"] = "SELECT_SUPPLIER_QUOTE";
    BrainStepType["APPROVE_PURCHASE_ORDER"] = "APPROVE_PURCHASE_ORDER";
    BrainStepType["RECEIVE_GOODS"] = "RECEIVE_GOODS";
    BrainStepType["CREATE_AP_BILL"] = "CREATE_AP_BILL";
    BrainStepType["POST_JOURNAL_ENTRY"] = "POST_JOURNAL_ENTRY";
    BrainStepType["CREATE_TRANSACTION"] = "CREATE_TRANSACTION";
    BrainStepType["CREATE_AR_INVOICE"] = "CREATE_AR_INVOICE";
    BrainStepType["RECORD_PAYMENT"] = "RECORD_PAYMENT";
    BrainStepType["SEND_NOTIFICATION"] = "SEND_NOTIFICATION";
})(BrainStepType || (exports.BrainStepType = BrainStepType = {}));
var BrainChainTemplate;
(function (BrainChainTemplate) {
    BrainChainTemplate["REPLENISHMENT_CHAIN"] = "REPLENISHMENT_CHAIN";
    BrainChainTemplate["INVOICE_CHAIN"] = "INVOICE_CHAIN";
    BrainChainTemplate["PAYMENT_CHAIN"] = "PAYMENT_CHAIN";
})(BrainChainTemplate || (exports.BrainChainTemplate = BrainChainTemplate = {}));
var BrainExecutionStatus;
(function (BrainExecutionStatus) {
    BrainExecutionStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    BrainExecutionStatus["APPROVED"] = "APPROVED";
    BrainExecutionStatus["REJECTED"] = "REJECTED";
    BrainExecutionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    BrainExecutionStatus["COMPLETED"] = "COMPLETED";
    BrainExecutionStatus["FAILED"] = "FAILED";
    BrainExecutionStatus["CANCELLED"] = "CANCELLED";
})(BrainExecutionStatus || (exports.BrainExecutionStatus = BrainExecutionStatus = {}));
var BrainStepStatus;
(function (BrainStepStatus) {
    BrainStepStatus["PENDING"] = "PENDING";
    BrainStepStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    BrainStepStatus["APPROVED"] = "APPROVED";
    BrainStepStatus["REJECTED"] = "REJECTED";
    BrainStepStatus["EXECUTING"] = "EXECUTING";
    BrainStepStatus["COMPLETED"] = "COMPLETED";
    BrainStepStatus["FAILED"] = "FAILED";
    BrainStepStatus["SKIPPED"] = "SKIPPED";
})(BrainStepStatus || (exports.BrainStepStatus = BrainStepStatus = {}));
//# sourceMappingURL=brain.enum.js.map