"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmQuoteStatus = exports.ActivityType = exports.OpportunityStage = exports.LeadSource = exports.LeadStatus = exports.CustomerStatus = exports.CustomerType = void 0;
var CustomerType;
(function (CustomerType) {
    CustomerType["INDIVIDUAL"] = "individual";
    CustomerType["BUSINESS"] = "business";
})(CustomerType || (exports.CustomerType = CustomerType = {}));
var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["ACTIVE"] = "active";
    CustomerStatus["INACTIVE"] = "inactive";
    CustomerStatus["BLOCKED"] = "blocked";
})(CustomerStatus || (exports.CustomerStatus = CustomerStatus = {}));
var LeadStatus;
(function (LeadStatus) {
    LeadStatus["NEW"] = "new";
    LeadStatus["CONTACTED"] = "contacted";
    LeadStatus["QUALIFIED"] = "qualified";
    LeadStatus["UNQUALIFIED"] = "unqualified";
    LeadStatus["CONVERTED"] = "converted";
})(LeadStatus || (exports.LeadStatus = LeadStatus = {}));
var LeadSource;
(function (LeadSource) {
    LeadSource["WEBSITE"] = "website";
    LeadSource["REFERRAL"] = "referral";
    LeadSource["SOCIAL_MEDIA"] = "social_media";
    LeadSource["EMAIL"] = "email";
    LeadSource["COLD_CALL"] = "cold_call";
    LeadSource["EVENT"] = "event";
    LeadSource["OTHER"] = "other";
})(LeadSource || (exports.LeadSource = LeadSource = {}));
var OpportunityStage;
(function (OpportunityStage) {
    OpportunityStage["PROSPECTING"] = "prospecting";
    OpportunityStage["QUALIFICATION"] = "qualification";
    OpportunityStage["PROPOSAL"] = "proposal";
    OpportunityStage["NEGOTIATION"] = "negotiation";
    OpportunityStage["CLOSED_WON"] = "closed_won";
    OpportunityStage["CLOSED_LOST"] = "closed_lost";
})(OpportunityStage || (exports.OpportunityStage = OpportunityStage = {}));
var ActivityType;
(function (ActivityType) {
    ActivityType["CALL"] = "call";
    ActivityType["EMAIL"] = "email";
    ActivityType["MEETING"] = "meeting";
    ActivityType["TASK"] = "task";
    ActivityType["NOTE"] = "note";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var CrmQuoteStatus;
(function (CrmQuoteStatus) {
    CrmQuoteStatus["DRAFT"] = "draft";
    CrmQuoteStatus["SENT"] = "sent";
    CrmQuoteStatus["ACCEPTED"] = "accepted";
    CrmQuoteStatus["REJECTED"] = "rejected";
    CrmQuoteStatus["EXPIRED"] = "expired";
})(CrmQuoteStatus || (exports.CrmQuoteStatus = CrmQuoteStatus = {}));
//# sourceMappingURL=crm.enum.js.map