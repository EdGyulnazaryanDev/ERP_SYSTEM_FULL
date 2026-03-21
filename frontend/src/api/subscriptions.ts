import apiClient from './client';

export type PlanFeature = 'warehouse' | 'reports' | 'accounting';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  pricing: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeature[];
  limits: Record<string, number | null>;
}

export interface CurrentSubscription {
  id: string;
  tenantId: string;
  status: string;
  billingCycle: BillingCycle;
  price: number;
  startsAt: string;
  endsAt: string | null;
  autoRenew: boolean;
  plan: SubscriptionPlan;
  metadata: Record<string, unknown> | null;
}

export const subscriptionsApi = {
  getPlans: () => apiClient.get<SubscriptionPlan[]>('/subscriptions/plans'),

  getCurrentSubscription: () =>
    apiClient.get<CurrentSubscription>('/subscriptions/current'),

  selectPlan: (data: {
    planCode: string;
    billingCycle: BillingCycle;
    autoRenew?: boolean;
  }) => apiClient.post<CurrentSubscription>('/subscriptions/select-plan', data),
};
