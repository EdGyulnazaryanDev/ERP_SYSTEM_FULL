"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_URLS = void 0;
exports.SERVICE_URLS = {
    INVENTORY: process.env.INVENTORY_SERVICE_URL ?? 'http://inventory-service:3001',
    PROCUREMENT: process.env.PROCUREMENT_SERVICE_URL ?? 'http://procurement-service:3002',
    ACCOUNTING: process.env.ACCOUNTING_SERVICE_URL ?? 'http://accounting-service:3003',
    HR: process.env.HR_SERVICE_URL ?? 'http://hr-service:3004',
    CRM: process.env.CRM_SERVICE_URL ?? 'http://crm-service:3005',
};
//# sourceMappingURL=service-urls.js.map