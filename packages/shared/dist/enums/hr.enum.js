"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryComponentType = exports.PayslipStatus = exports.AttendanceStatus = exports.LeaveRequestStatus = exports.EmploymentType = exports.EmploymentStatus = void 0;
var EmploymentStatus;
(function (EmploymentStatus) {
    EmploymentStatus["ACTIVE"] = "active";
    EmploymentStatus["ON_LEAVE"] = "on_leave";
    EmploymentStatus["SUSPENDED"] = "suspended";
    EmploymentStatus["TERMINATED"] = "terminated";
})(EmploymentStatus || (exports.EmploymentStatus = EmploymentStatus = {}));
var EmploymentType;
(function (EmploymentType) {
    EmploymentType["FULL_TIME"] = "full_time";
    EmploymentType["PART_TIME"] = "part_time";
    EmploymentType["CONTRACT"] = "contract";
    EmploymentType["INTERN"] = "intern";
    EmploymentType["FREELANCE"] = "freelance";
})(EmploymentType || (exports.EmploymentType = EmploymentType = {}));
var LeaveRequestStatus;
(function (LeaveRequestStatus) {
    LeaveRequestStatus["PENDING"] = "pending";
    LeaveRequestStatus["APPROVED"] = "approved";
    LeaveRequestStatus["REJECTED"] = "rejected";
    LeaveRequestStatus["CANCELLED"] = "cancelled";
})(LeaveRequestStatus || (exports.LeaveRequestStatus = LeaveRequestStatus = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["LATE"] = "late";
    AttendanceStatus["HALF_DAY"] = "half_day";
    AttendanceStatus["ON_LEAVE"] = "on_leave";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var PayslipStatus;
(function (PayslipStatus) {
    PayslipStatus["DRAFT"] = "draft";
    PayslipStatus["APPROVED"] = "approved";
    PayslipStatus["PAID"] = "paid";
    PayslipStatus["CANCELLED"] = "cancelled";
})(PayslipStatus || (exports.PayslipStatus = PayslipStatus = {}));
var SalaryComponentType;
(function (SalaryComponentType) {
    SalaryComponentType["FIXED"] = "fixed";
    SalaryComponentType["PERCENTAGE"] = "percentage";
    SalaryComponentType["FORMULA"] = "formula";
})(SalaryComponentType || (exports.SalaryComponentType = SalaryComponentType = {}));
//# sourceMappingURL=hr.enum.js.map