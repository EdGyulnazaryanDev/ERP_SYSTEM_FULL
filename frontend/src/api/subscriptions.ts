import apiClient from './client';

export type PlanFeature =
  | 'dashboard' | 'products' | 'categories' | 'inventory' | 'transactions'
  | 'users' | 'settings' | 'rbac'
  | 'accounting' | 'payments' | 'crm' | 'hr' | 'procurement' | 'warehouse'
  | 'transportation' | 'projects' | 'manufacturing' | 'equipment' | 'services'
  | 'communication' | 'compliance' | 'reports' | 'suppliers';

export type BillingCycle = 'monthly' | 'yearly';
export type PlanLimitKey = 'users' | 'products' | 'categories' | 'transactions_per_month' | 'storage_gb';

export interface PlanLimit {
  key: PlanLimitKey;
  value: number | null;
}

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
  isActive?: boolean;
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

export interface CreatePlanPayload {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: PlanFeature[];
  limits: PlanLimit[];
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export const subscriptionsApi = {
  getPlans: () => apiClient.get<SubscriptionPlan[]>('/subscriptions/plans'),

  getCurrentSubscription: () =>
    apiClient.get<CurrentSubscription | null>('/subscriptions/current'),

  selectPlan: (data: {
    planCode: string;
    billingCycle: BillingCycle;
    autoRenew?: boolean;
  }) => apiClient.post<CurrentSubscription>('/subscriptions/select-plan', data),
};

export const adminSubscriptionsApi = {
  getAllPlans: () =>
    apiClient.get<SubscriptionPlan[]>('/admin/subscription-plans'),

  createPlan: (data: CreatePlanPayload) =>
    apiClient.post<SubscriptionPlan>('/admin/subscription-plans', data),

  updatePlan: (id: string, data: UpdatePlanPayload) =>
    apiClient.patch<SubscriptionPlan>(`/admin/subscription-plans/${id}`, data),

  deletePlan: (id: string) =>
    apiClient.delete(`/admin/subscription-plans/${id}`),

  setPlanStatus: (id: string, isActive: boolean) =>
    apiClient.patch<SubscriptionPlan>(`/admin/subscription-plans/${id}/status`, { isActive }),
};
