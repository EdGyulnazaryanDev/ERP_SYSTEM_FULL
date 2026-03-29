export enum PlanCode {
  STARTER = 'starter',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  FULL = 'full',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  TRIAL = 'trial',
}

export enum PlanFeature {
  // Core (always available — not gated)
  DASHBOARD = 'dashboard',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  INVENTORY = 'inventory',
  TRANSACTIONS = 'transactions',
  USERS = 'users',
  SETTINGS = 'settings',
  RBAC = 'rbac',
  // Gated modules
  ACCOUNTING = 'accounting',
  PAYMENTS = 'payments',
  CRM = 'crm',
  HR = 'hr',
  PROCUREMENT = 'procurement',
  WAREHOUSE = 'warehouse',
  TRANSPORTATION = 'transportation',
  PROJECTS = 'projects',
  MANUFACTURING = 'manufacturing',
  EQUIPMENT = 'equipment',
  SERVICES = 'services',
  COMMUNICATION = 'communication',
  COMPLIANCE = 'compliance',
  REPORTS = 'reports',
  SUPPLIERS = 'suppliers',
}

export enum PlanLimitKey {
  USERS = 'users',
  STORAGE_GB = 'storage_gb',
  TRANSACTIONS_PER_MONTH = 'transactions_per_month',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
}

export interface DefaultPlanDefinition {
  code: PlanCode;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  limits: Array<{
    key: PlanLimitKey;
    value: number | null;
  }>;
}

export const DEFAULT_PLAN_DEFINITIONS: DefaultPlanDefinition[] = [
  {
    code: PlanCode.STARTER,
    name: 'Starter',
    description: 'Essential ERP access for small teams.',
    monthlyPrice: 19,
    yearlyPrice: 190,
    features: [
      PlanFeature.DASHBOARD,
      PlanFeature.PRODUCTS,
      PlanFeature.CATEGORIES,
      PlanFeature.INVENTORY,
      PlanFeature.TRANSACTIONS,
      PlanFeature.USERS,
      PlanFeature.RBAC,
      PlanFeature.SETTINGS,
      PlanFeature.ACCOUNTING,
      PlanFeature.HR,
      PlanFeature.CRM,
      PlanFeature.WAREHOUSE,
      PlanFeature.TRANSPORTATION,
      PlanFeature.PROCUREMENT,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: 3 },
      { key: PlanLimitKey.PRODUCTS, value: 20 },
      { key: PlanLimitKey.CATEGORIES, value: 2 },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: 500 },
      { key: PlanLimitKey.STORAGE_GB, value: 5 },
    ],
  },
  {
    code: PlanCode.BASIC,
    name: 'Basic',
    description: 'Adds suppliers, payments, procurement, and CRM.',
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: [
      PlanFeature.SUPPLIERS,
      PlanFeature.PAYMENTS,
      PlanFeature.PROCUREMENT,
      PlanFeature.CRM,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: 10 },
      { key: PlanLimitKey.PRODUCTS, value: 200 },
      { key: PlanLimitKey.CATEGORIES, value: 10 },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: 5000 },
      { key: PlanLimitKey.STORAGE_GB, value: 25 },
    ],
  },
  {
    code: PlanCode.PRO,
    name: 'Pro',
    description:
      'Full warehouse, accounting, BI, HR, transportation, and more.',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      PlanFeature.SUPPLIERS,
      PlanFeature.PAYMENTS,
      PlanFeature.PROCUREMENT,
      PlanFeature.CRM,
      PlanFeature.WAREHOUSE,
      PlanFeature.ACCOUNTING,
      PlanFeature.REPORTS,
      PlanFeature.HR,
      PlanFeature.TRANSPORTATION,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: 50 },
      { key: PlanLimitKey.PRODUCTS, value: 2000 },
      { key: PlanLimitKey.CATEGORIES, value: null },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: 50000 },
      { key: PlanLimitKey.STORAGE_GB, value: 250 },
    ],
  },
  {
    code: PlanCode.ENTERPRISE,
    name: 'Full Unlocked',
    description: 'Unlimited access across all modules.',
    monthlyPrice: 500,
    yearlyPrice: 5600,
    features: [
      PlanFeature.DASHBOARD,
      PlanFeature.PRODUCTS,
      PlanFeature.CATEGORIES,
      PlanFeature.INVENTORY,
      PlanFeature.TRANSACTIONS,
      PlanFeature.USERS,
      PlanFeature.SETTINGS,
      PlanFeature.RBAC,
      PlanFeature.ACCOUNTING,
      PlanFeature.PAYMENTS,
      PlanFeature.CRM,
      PlanFeature.HR,
      PlanFeature.PROCUREMENT,
      PlanFeature.WAREHOUSE,
      PlanFeature.TRANSPORTATION,
      PlanFeature.PROJECTS,
      PlanFeature.MANUFACTURING,
      PlanFeature.EQUIPMENT,
      PlanFeature.SERVICES,
      PlanFeature.COMMUNICATION,
      PlanFeature.COMPLIANCE,
      PlanFeature.REPORTS,
      PlanFeature.SUPPLIERS,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: null },
      { key: PlanLimitKey.PRODUCTS, value: null },
      { key: PlanLimitKey.CATEGORIES, value: null },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: null },
      { key: PlanLimitKey.STORAGE_GB, value: null },
    ],
  },
];
