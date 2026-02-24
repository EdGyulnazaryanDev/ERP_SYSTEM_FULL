import apiClient from './client';

export interface FinancialSummary {
  today: {
    income: number;
    outcome: number;
    profit: number;
  };
  thisMonth: {
    income: number;
    outcome: number;
    profit: number;
  };
  thisYear: {
    income: number;
    outcome: number;
    profit: number;
  };
}

export interface FinancialReport {
  id: string;
  tenant_id: string;
  period: string;
  start_date: string;
  end_date: string;
  total_income: number;
  total_outcome: number;
  net_profit: number;
  gross_profit: number;
  operating_expenses: number;
  cost_of_goods_sold: number;
  transaction_count: number;
  sales_count: number;
  purchase_count: number;
  breakdown: {
    incomeByCategory: Record<string, number>;
    outcomeByCategory: Record<string, number>;
    dailyIncome: Array<{ date: string; amount: number }>;
    dailyOutcome: Array<{ date: string; amount: number }>;
    profitMargin: number;
    averageTransactionValue: number;
  };
}

export interface CashFlow {
  startDate: string;
  endDate: string;
  startingBalance: number;
  endingBalance: number;
  cashFlow: Array<{
    date: string;
    transaction_number: string;
    type: string;
    amount: number;
    balance: number;
  }>;
}

export const financeApi = {
  getSummary: () => apiClient.get<FinancialSummary>('/finance/summary'),

  getDailyReport: (date: string) =>
    apiClient.get<FinancialReport>('/finance/reports/daily', {
      params: { date },
    }),

  getWeeklyReport: (date: string) =>
    apiClient.get<FinancialReport>('/finance/reports/weekly', {
      params: { date },
    }),

  getMonthlyReport: (year: number, month: number) =>
    apiClient.get<FinancialReport>('/finance/reports/monthly', {
      params: { year, month },
    }),

  getQuarterlyReport: (year: number, quarter: number) =>
    apiClient.get<FinancialReport>('/finance/reports/quarterly', {
      params: { year, quarter },
    }),

  getYearlyReport: (year: number) =>
    apiClient.get<FinancialReport>('/finance/reports/yearly', {
      params: { year },
    }),

  getCustomReport: (startDate: string, endDate: string) =>
    apiClient.get<FinancialReport>('/finance/reports/custom', {
      params: { startDate, endDate },
    }),

  getCashFlow: (startDate: string, endDate: string) =>
    apiClient.get<CashFlow>('/finance/cash-flow', {
      params: { startDate, endDate },
    }),
};
