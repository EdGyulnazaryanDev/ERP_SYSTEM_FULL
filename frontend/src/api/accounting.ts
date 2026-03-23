import apiClient from './client';

export const accountingApi = {
  // Chart of Accounts
  getAccounts: () => apiClient.get('/accounting/accounts'),
  getAccount: (id: string) => apiClient.get(`/accounting/accounts/${id}`),
  createAccount: (data: any) => apiClient.post('/accounting/accounts', data),
  updateAccount: (id: string, data: any) => apiClient.put(`/accounting/accounts/${id}`, data),
  deleteAccount: (id: string) => apiClient.delete(`/accounting/accounts/${id}`),

  // Journal Entries
  getJournalEntries: () => apiClient.get('/accounting/journal-entries'),
  getJournalEntry: (id: string) => apiClient.get(`/accounting/journal-entries/${id}`),
  createJournalEntry: (data: any) => apiClient.post('/accounting/journal-entries', data),
  postJournalEntry: (id: string, data: any) => apiClient.post(`/accounting/journal-entries/${id}/post`, data),
  reverseJournalEntry: (id: string, data: any) => apiClient.post(`/accounting/journal-entries/${id}/reverse`, data),

  // Accounts Receivable
  getAccountsReceivable: () => apiClient.get('/accounting/accounts-receivable'),
  getAR: (id: string) => apiClient.get(`/accounting/accounts-receivable/${id}`),
  createAR: (data: any) => apiClient.post('/accounting/accounts-receivable', data),
  submitAR: (id: string) => apiClient.post(`/accounting/accounts-receivable/${id}/submit`),
  approveAR: (id: string, data?: any) => apiClient.post(`/accounting/accounts-receivable/${id}/approve`, data || {}),
  rejectAR: (id: string, data?: any) => apiClient.post(`/accounting/accounts-receivable/${id}/reject`, data || {}),
  postAR: (id: string) => apiClient.post(`/accounting/accounts-receivable/${id}/post`),
  signAR: (id: string, data: any) => {
    const { id: _ignored, ...body } = data || {};
    return apiClient.post(`/accounting/accounts-receivable/${id}/sign`, body);
  },
  recordARPayment: (id: string, data: any) => apiClient.post(`/accounting/accounts-receivable/${id}/payment`, data),

  // Accounts Payable
  getAccountsPayable: () => apiClient.get('/accounting/accounts-payable'),
  getAP: (id: string) => apiClient.get(`/accounting/accounts-payable/${id}`),
  createAP: (data: any) => apiClient.post('/accounting/accounts-payable', data),
  recordAPPayment: (id: string, data: any) => apiClient.post(`/accounting/accounts-payable/${id}/payment`, data),

  // Bank Accounts
  getBankAccounts: () => apiClient.get('/accounting/bank-accounts'),
  getBankAccount: (id: string) => apiClient.get(`/accounting/bank-accounts/${id}`),
  createBankAccount: (data: any) => apiClient.post('/accounting/bank-accounts', data),
  updateBankAccount: (id: string, data: any) => apiClient.put(`/accounting/bank-accounts/${id}`, data),

  // Reports
  getTrialBalance: (startDate?: string, endDate?: string) => 
    apiClient.get('/accounting/reports/trial-balance', { params: { start_date: startDate, end_date: endDate } }),
  getBalanceSheet: (asOfDate?: string) => 
    apiClient.get('/accounting/reports/balance-sheet', { params: { as_of_date: asOfDate } }),
  getProfitAndLoss: (startDate: string, endDate: string) => 
    apiClient.get('/accounting/reports/profit-and-loss', { params: { start_date: startDate, end_date: endDate } }),
};
