"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodStatus = exports.FiscalYearStatus = exports.BankAccountType = exports.APStatus = exports.ARStatus = exports.JournalEntryType = exports.JournalEntryStatus = exports.AccountType = void 0;
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "asset";
    AccountType["LIABILITY"] = "liability";
    AccountType["EQUITY"] = "equity";
    AccountType["REVENUE"] = "revenue";
    AccountType["EXPENSE"] = "expense";
})(AccountType || (exports.AccountType = AccountType = {}));
var JournalEntryStatus;
(function (JournalEntryStatus) {
    JournalEntryStatus["DRAFT"] = "draft";
    JournalEntryStatus["POSTED"] = "posted";
    JournalEntryStatus["REVERSED"] = "reversed";
    JournalEntryStatus["VOID"] = "void";
})(JournalEntryStatus || (exports.JournalEntryStatus = JournalEntryStatus = {}));
var JournalEntryType;
(function (JournalEntryType) {
    JournalEntryType["GENERAL"] = "general";
    JournalEntryType["SALES"] = "sales";
    JournalEntryType["PURCHASE"] = "purchase";
    JournalEntryType["PAYMENT"] = "payment";
    JournalEntryType["RECEIPT"] = "receipt";
    JournalEntryType["ADJUSTMENT"] = "adjustment";
})(JournalEntryType || (exports.JournalEntryType = JournalEntryType = {}));
var ARStatus;
(function (ARStatus) {
    ARStatus["UNPAID"] = "unpaid";
    ARStatus["PARTIALLY_PAID"] = "partially_paid";
    ARStatus["PAID"] = "paid";
    ARStatus["OVERDUE"] = "overdue";
    ARStatus["CANCELLED"] = "cancelled";
})(ARStatus || (exports.ARStatus = ARStatus = {}));
var APStatus;
(function (APStatus) {
    APStatus["UNPAID"] = "unpaid";
    APStatus["PARTIALLY_PAID"] = "partially_paid";
    APStatus["PAID"] = "paid";
    APStatus["OVERDUE"] = "overdue";
    APStatus["CANCELLED"] = "cancelled";
})(APStatus || (exports.APStatus = APStatus = {}));
var BankAccountType;
(function (BankAccountType) {
    BankAccountType["CHECKING"] = "checking";
    BankAccountType["SAVINGS"] = "savings";
    BankAccountType["CREDIT"] = "credit";
    BankAccountType["INVESTMENT"] = "investment";
})(BankAccountType || (exports.BankAccountType = BankAccountType = {}));
var FiscalYearStatus;
(function (FiscalYearStatus) {
    FiscalYearStatus["OPEN"] = "open";
    FiscalYearStatus["CLOSED"] = "closed";
})(FiscalYearStatus || (exports.FiscalYearStatus = FiscalYearStatus = {}));
var PeriodStatus;
(function (PeriodStatus) {
    PeriodStatus["OPEN"] = "open";
    PeriodStatus["CLOSED"] = "closed";
    PeriodStatus["LOCKED"] = "locked";
})(PeriodStatus || (exports.PeriodStatus = PeriodStatus = {}));
//# sourceMappingURL=accounting.enum.js.map