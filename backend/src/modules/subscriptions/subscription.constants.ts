export enum PlanCode {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
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
  WAREHOUSE = 'warehouse',
  REPORTS = 'reports',
  ACCOUNTING = 'accounting',
}

export enum PlanLimitKey {
  USERS = 'users',
  STORAGE_GB = 'storage_gb',
  TRANSACTIONS_PER_MONTH = 'transactions_per_month',
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
    code: PlanCode.BASIC,
    name: 'Basic',
    description: 'Essential ERP access for smaller companies.',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [PlanFeature.WAREHOUSE],
    limits: [
      { key: PlanLimitKey.USERS, value: 5 },
      { key: PlanLimitKey.STORAGE_GB, value: 25 },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: 1000 },
    ],
  },
  {
    code: PlanCode.PRO,
    name: 'Pro',
    description: 'Adds accounting and reporting for growing teams.',
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: [
      PlanFeature.WAREHOUSE,
      PlanFeature.ACCOUNTING,
      PlanFeature.REPORTS,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: 25 },
      { key: PlanLimitKey.STORAGE_GB, value: 250 },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: 10000 },
    ],
  },
  {
    code: PlanCode.ENTERPRISE,
    name: 'Enterprise',
    description: 'Full platform access with effectively unlimited scale.',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      PlanFeature.WAREHOUSE,
      PlanFeature.ACCOUNTING,
      PlanFeature.REPORTS,
    ],
    limits: [
      { key: PlanLimitKey.USERS, value: null },
      { key: PlanLimitKey.STORAGE_GB, value: null },
      { key: PlanLimitKey.TRANSACTIONS_PER_MONTH, value: null },
    ],
  },
];
