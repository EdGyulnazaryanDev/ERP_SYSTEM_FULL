import apiClient from './client';

export interface DashboardKpi {
  value: number;
  label: string;
  growth?: number;
  prefix?: string;
  sub?: string;
}

export interface RevenuePoint {
  date: string;
  sales: number;
  purchases: number;
}

export interface RecentTransaction {
  id: string;
  number: string;
  type: string;
  status: string;
  amount: number;
  customer: string | null;
  date: string;
}

export interface InventorySummary {
  totalItems: number;
  totalQty: number;
  totalValue: number;
  outOfStock: number;
  lowStock: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  qty: number;
  reorderLevel: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  description: string | null;
  severity: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
}

export interface MyStats {
  totalTransactions: number;
  totalSales: number;
  totalPurchases: number;
  pending: number;
}

export interface TeamTransaction {
  id: string;
  number: string;
  type: string;
  status: string;
  amount: number;
  customer: string | null;
  supplier: string | null;
  date: string;
}

export interface DashboardSummary {
  kpis: {
    revenue?: DashboardKpi;
    pendingTransactions?: DashboardKpi;
    inventoryValue?: DashboardKpi;
    products?: DashboardKpi;
  };
  revenueChart: RevenuePoint[];
  recentTransactions: RecentTransaction[];
  inventorySummary: InventorySummary | null;
  lowStockItems: LowStockItem[];
  userCount: number;
  planInfo: {
    planName: string;
    status: string;
    billingCycle: string | null;
    features: string[];
  };
  activityLogs: ActivityLog[];
  myStats: MyStats | null;
  teamTransactions: TeamTransaction[];
  enabledFeatures: string[];
  role: { isAdmin: boolean; isManager: boolean };
}

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
};
