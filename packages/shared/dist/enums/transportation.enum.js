"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteStatus = exports.CourierStatus = exports.CourierType = exports.ShipmentPriority = exports.ShipmentStatus = void 0;
var ShipmentStatus;
(function (ShipmentStatus) {
    ShipmentStatus["PENDING"] = "pending";
    ShipmentStatus["PICKED_UP"] = "picked_up";
    ShipmentStatus["IN_TRANSIT"] = "in_transit";
    ShipmentStatus["OUT_FOR_DELIVERY"] = "out_for_delivery";
    ShipmentStatus["DELIVERED"] = "delivered";
    ShipmentStatus["FAILED"] = "failed";
    ShipmentStatus["RETURNED"] = "returned";
    ShipmentStatus["CANCELLED"] = "cancelled";
})(ShipmentStatus || (exports.ShipmentStatus = ShipmentStatus = {}));
var ShipmentPriority;
(function (ShipmentPriority) {
    ShipmentPriority["LOW"] = "low";
    ShipmentPriority["NORMAL"] = "normal";
    ShipmentPriority["HIGH"] = "high";
    ShipmentPriority["EXPRESS"] = "express";
})(ShipmentPriority || (exports.ShipmentPriority = ShipmentPriority = {}));
var CourierType;
(function (CourierType) {
    CourierType["INTERNAL"] = "internal";
    CourierType["EXTERNAL"] = "external";
})(CourierType || (exports.CourierType = CourierType = {}));
var CourierStatus;
(function (CourierStatus) {
    CourierStatus["ACTIVE"] = "active";
    CourierStatus["INACTIVE"] = "inactive";
    CourierStatus["ON_ROUTE"] = "on_route";
})(CourierStatus || (exports.CourierStatus = CourierStatus = {}));
var RouteStatus;
(function (RouteStatus) {
    RouteStatus["PLANNED"] = "planned";
    RouteStatus["IN_PROGRESS"] = "in_progress";
    RouteStatus["COMPLETED"] = "completed";
    RouteStatus["CANCELLED"] = "cancelled";
})(RouteStatus || (exports.RouteStatus = RouteStatus = {}));
//# sourceMappingURL=transportation.enum.js.map