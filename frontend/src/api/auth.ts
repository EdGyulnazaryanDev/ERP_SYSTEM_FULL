import apiClient from './client';
import type { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
  actorType?: 'staff' | 'customer' | 'supplier';
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface ActivatePortalAccountRequest {
  actorType: 'customer' | 'supplier';
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SetPortalCredentialsRequest {
  actorType: 'customer' | 'supplier';
  actorId: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  quickLogin: () =>
    apiClient.post<AuthResponse>('/test-auth/quick-login'),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  activatePortalAccount: (data: ActivatePortalAccountRequest) =>
    apiClient.post<AuthResponse>('/auth/activate', data),

  setPortalCredentials: (data: SetPortalCredentialsRequest) =>
    apiClient.post('/auth/portal-accounts', data),

  logout: () =>
    apiClient.post('/auth/logout'),

  getCurrentUser: () =>
    apiClient.get<User>('/auth/me'),
};
