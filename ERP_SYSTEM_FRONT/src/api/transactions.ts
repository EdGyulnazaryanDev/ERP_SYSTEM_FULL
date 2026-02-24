import apiClient from './client';

export enum TransactionType {
  SALE = 'sale',
  PURCHASE = 'purchase',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT = 'credit',
}

export interface TransactionItem {
  id?: string;
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  transaction_number: string;
  type: TransactionType;
  status: TransactionStatus;
  customer_id?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  transaction_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method?: PaymentMethod;
  notes?: string;
  terms?: string;
  items: TransactionItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  customer_id?: string;
  customer_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  transaction_date: string;
  due_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  shipping_amount?: number;
  paid_amount?: number;
  payment_method?: PaymentMethod;
  notes?: string;
  terms?: string;
  items: TransactionItem[];
}

export interface TransactionAnalytics {
  totalSales: number;
  totalPurchases: number;
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  salesCount: number;
  purchaseCount: number;
  averageOrderValue: number;
  topProducts: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{ date: string; amount: number }>;
  monthlySales: Array<{ month: string; amount: number }>;
  salesByStatus: {
    draft: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  salesByPaymentMethod: Record<string, number>;
}

export const transactionsApi = {
  getAll: (params?: {
    type?: TransactionType;
    status?: TransactionStatus;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get<Transaction[]>('/transactions', { params }),

  getOne: (id: string) => apiClient.get<Transaction>(`/transactions/${id}`),

  getById: (id: string) => apiClient.get<Transaction>(`/transactions/${id}`),

  create: (data: CreateTransactionDto) =>
    apiClient.post<Transaction>('/transactions', data),

  update: (id: string, data: CreateTransactionDto) =>
    apiClient.put<Transaction>(`/transactions/${id}`, data),

  complete: (id: string) =>
    apiClient.put<Transaction>(`/transactions/${id}/complete`),

  cancel: (id: string) =>
    apiClient.put<Transaction>(`/transactions/${id}/cancel`),

  delete: (id: string) => apiClient.delete(`/transactions/${id}`),

  getAnalytics: (startDate: string, endDate: string) =>
    apiClient.get<TransactionAnalytics>('/transactions/analytics', {
      params: { startDate, endDate },
    }),

  exportExcel: (params?: {
    type?: TransactionType;
    status?: TransactionStatus;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient.get('/transactions/export', {
      params,
      responseType: 'blob',
    }),

  exportTransactionExcel: (id: string) =>
    apiClient.get(`/transactions/${id}/export`, {
      responseType: 'blob',
    }),

  downloadPdf: (id: string) =>
    apiClient.get(`/transactions/${id}/pdf`, {
      responseType: 'blob',
    }),

  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
