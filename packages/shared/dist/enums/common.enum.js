"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SortOrder = exports.ActorType = exports.Priority = exports.ApprovalStatus = exports.CommonStatus = void 0;
var CommonStatus;
(function (CommonStatus) {
    CommonStatus["ACTIVE"] = "active";
    CommonStatus["INACTIVE"] = "inactive";
})(CommonStatus || (exports.CommonStatus = CommonStatus = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "pending";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["CRITICAL"] = "critical";
})(Priority || (exports.Priority = Priority = {}));
var ActorType;
(function (ActorType) {
    ActorType["STAFF"] = "staff";
    ActorType["CUSTOMER"] = "customer";
    ActorType["SUPPLIER"] = "supplier";
})(ActorType || (exports.ActorType = ActorType = {}));
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "ASC";
    SortOrder["DESC"] = "DESC";
})(SortOrder || (exports.SortOrder = SortOrder = {}));
//# sourceMappingURL=common.enum.js.map