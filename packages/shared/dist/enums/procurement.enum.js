"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemQualityStatus = exports.QuoteStatus = exports.RfqStatus = exports.GoodsReceiptStatus = exports.PurchaseOrderStatus = exports.RequisitionPriority = exports.RequisitionStatus = void 0;
var RequisitionStatus;
(function (RequisitionStatus) {
    RequisitionStatus["DRAFT"] = "draft";
    RequisitionStatus["PENDING"] = "pending";
    RequisitionStatus["APPROVED"] = "approved";
    RequisitionStatus["REJECTED"] = "rejected";
    RequisitionStatus["CANCELLED"] = "cancelled";
    RequisitionStatus["FULFILLED"] = "fulfilled";
})(RequisitionStatus || (exports.RequisitionStatus = RequisitionStatus = {}));
var RequisitionPriority;
(function (RequisitionPriority) {
    RequisitionPriority["LOW"] = "low";
    RequisitionPriority["MEDIUM"] = "medium";
    RequisitionPriority["HIGH"] = "high";
    RequisitionPriority["URGENT"] = "urgent";
})(RequisitionPriority || (exports.RequisitionPriority = RequisitionPriority = {}));
var PurchaseOrderStatus;
(function (PurchaseOrderStatus) {
    PurchaseOrderStatus["DRAFT"] = "draft";
    PurchaseOrderStatus["SENT"] = "sent";
    PurchaseOrderStatus["ACKNOWLEDGED"] = "acknowledged";
    PurchaseOrderStatus["PARTIALLY_RECEIVED"] = "partially_received";
    PurchaseOrderStatus["RECEIVED"] = "received";
    PurchaseOrderStatus["CANCELLED"] = "cancelled";
    PurchaseOrderStatus["CLOSED"] = "closed";
})(PurchaseOrderStatus || (exports.PurchaseOrderStatus = PurchaseOrderStatus = {}));
var GoodsReceiptStatus;
(function (GoodsReceiptStatus) {
    GoodsReceiptStatus["PENDING"] = "pending";
    GoodsReceiptStatus["APPROVED"] = "approved";
    GoodsReceiptStatus["REJECTED"] = "rejected";
})(GoodsReceiptStatus || (exports.GoodsReceiptStatus = GoodsReceiptStatus = {}));
var RfqStatus;
(function (RfqStatus) {
    RfqStatus["OPEN"] = "open";
    RfqStatus["CLOSED"] = "closed";
    RfqStatus["CANCELLED"] = "cancelled";
})(RfqStatus || (exports.RfqStatus = RfqStatus = {}));
var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["RECEIVED"] = "received";
    QuoteStatus["SELECTED"] = "selected";
    QuoteStatus["REJECTED"] = "rejected";
})(QuoteStatus || (exports.QuoteStatus = QuoteStatus = {}));
var ItemQualityStatus;
(function (ItemQualityStatus) {
    ItemQualityStatus["ACCEPTED"] = "accepted";
    ItemQualityStatus["REJECTED"] = "rejected";
    ItemQualityStatus["PARTIAL"] = "partial";
})(ItemQualityStatus || (exports.ItemQualityStatus = ItemQualityStatus = {}));
//# sourceMappingURL=procurement.enum.js.map