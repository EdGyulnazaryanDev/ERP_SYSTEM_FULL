"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementStatus = exports.MovementType = void 0;
var MovementType;
(function (MovementType) {
    MovementType["STOCK_IN"] = "stock_in";
    MovementType["STOCK_OUT"] = "stock_out";
    MovementType["TRANSFER"] = "transfer";
    MovementType["ADJUSTMENT"] = "adjustment";
    MovementType["RETURN"] = "return";
})(MovementType || (exports.MovementType = MovementType = {}));
var MovementStatus;
(function (MovementStatus) {
    MovementStatus["PENDING"] = "pending";
    MovementStatus["APPROVED"] = "approved";
    MovementStatus["REJECTED"] = "rejected";
    MovementStatus["COMPLETED"] = "completed";
})(MovementStatus || (exports.MovementStatus = MovementStatus = {}));
//# sourceMappingURL=inventory.enum.js.map