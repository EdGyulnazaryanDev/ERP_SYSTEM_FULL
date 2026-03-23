import { useAccessControl } from './useAccessControl';

export type PlanLimitKey = 'users' | 'products' | 'categories' | 'transactions_per_month' | 'storage_gb';

/**
 * Provides access to the current subscription plan's resource limits.
 */
export function usePlanLimits() {
  const { subscription } = useAccessControl();
  const limits: Record<string, number | null> = subscription?.plan.limits ?? {};

  const get = (key: PlanLimitKey): number | null => {
    const value = limits[key];
    return value === undefined ? null : value;
  };

  return { get, limits };
}
