import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// Determine base URL - use /api for Vite dev proxy, or environment variable
const baseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://spontaneous-dori-lumaportal-1f50f5d0.koyeb.app/api');

const apiClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Only send credentials when talking to same origin or explicitly configured
  withCredentials: baseURL.startsWith('/') || baseURL.includes('localhost'),
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState()?.token;
      if (token && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to add auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message ?? '';
      if (message === 'TENANT_DEACTIVATED') {
        // Don't log out — just flag the session as suspended so UI can show the screen
        sessionStorage.setItem('tenant_suspended', '1');
        window.dispatchEvent(new Event('tenant-suspended'));
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      error.message = error.code === 'ECONNABORTED'
        ? 'Request timeout - server not responding'
        : 'Network error - check if backend is running on port 3000';
    }

    return Promise.reject(error);
  },
);

export default apiClient;
