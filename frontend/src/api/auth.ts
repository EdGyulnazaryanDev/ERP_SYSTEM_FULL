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

export interface PortalStat {
  label: string;
  value: string | number | null;
  hint: string;
}

export interface PortalMetric {
  key: string;
  label: string;
  value: number | null;
}

export interface PortalPair {
  label: string;
  value: string;
}

export interface PortalActionCard {
  title: string;
  text: string;
  tags: string[];
}

export interface PortalTimelineItem {
  date: string;
  title: string;
  text: string;
}

export interface PortalRecentOrder {
  id: string;
  number: string;
  status: string;
  date: string;
  totalAmount: number;
  balanceAmount: number;
  itemCount: number;
}

export interface PortalRecentShipment {
  id: string;
  trackingNumber: string;
  status: string;
  destinationName: string;
  destinationCity?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  updatedAt?: string;
}

export interface PortalReceivable {
  id: string;
  invoiceNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  balanceAmount: number;
}

export interface PortalQuote {
  id: string;
  quoteNumber: string;
  status: string;
  quoteDate: string;
  validUntil: string;
  totalAmount: number;
}

export interface PortalActivity {
  id: string;
  type: string;
  status: string;
  subject: string;
  startDateTime: string;
  nextAction?: string;
}

export interface PortalSummary {
  actorType: 'customer' | 'supplier';
  generatedAt: string;
  customer?: {
    id: string;
    customerCode: string;
    companyName: string;
    contactPerson?: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
    status: string;
    paymentTerms: number;
    creditLimit: number;
  };
  supplier?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
  };
  heroStats: PortalStat[];
  kpis: PortalMetric[];
  accountContext: PortalPair[];
  actionCards: PortalActionCard[];
  recentOrders: PortalRecentOrder[];
  recentShipments: PortalRecentShipment[];
  receivables: PortalReceivable[];
  quotes: PortalQuote[];
  activities: PortalActivity[];
  timeline: PortalTimelineItem[];
  analytics?: {
    totalOrders: number;
    openOrders: number;
    completedOrders: number;
    activeShipments: number;
    deliveredShipments: number;
    totalInvoices: number;
    outstandingBalance: number;
    overdueInvoices: number;
    lifetimeRevenue: number;
    averageOrderValue: number;
    onTimeDeliveryRate: number | null;
  };
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

  getPortalSummary: () =>
    apiClient.get<PortalSummary>('/auth/portal-summary'),
};
