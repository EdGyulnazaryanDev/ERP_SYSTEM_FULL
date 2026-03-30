import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface MyProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  avatar_url?: string | null;
}

export function toPublicAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^https?:\/\/minio:\d+/, 'http://localhost:9100');
}

export function useMyProfile() {
  const { isAuthenticated, user } = useAuthStore();

  const { data } = useQuery<MyProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => (await apiClient.get<MyProfile>('/users/me')).data,
    enabled: isAuthenticated && user?.actorType === 'staff' && !user?.isSystemAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    profile: data,
    avatarUrl: toPublicAvatarUrl(data?.avatar_url),
  };
}
