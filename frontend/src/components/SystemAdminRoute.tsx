import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function SystemAdminRoute() {
  const { user } = useAuthStore();

  if (!user?.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
