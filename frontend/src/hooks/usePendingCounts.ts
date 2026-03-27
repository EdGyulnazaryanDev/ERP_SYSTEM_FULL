import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export function usePendingCounts() {
  const { isAuthenticated, user } = useAuthStore();
  const enabled = isAuthenticated && !user?.isSystemAdmin && user?.actorType === 'staff';

  const { data: procurementData } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/procurement/pending-approvals');
      return Array.isArray(res.data) ? res.data.length : 0;
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ['pending-shipments-count'],
    queryFn: async () => {
      const res = await apiClient.get<{ count: number }>('/transportation/shipments/pending-count');
      return res.data.count ?? 0;
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    procurementPending: procurementData ?? 0,
    shipmentsPending: shipmentsData ?? 0,
  };
}
