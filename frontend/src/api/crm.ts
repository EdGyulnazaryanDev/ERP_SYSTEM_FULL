import apiClient from './client';

export const crmApi = {
  // Customers
  getCustomers: () => apiClient.get('/crm/customers'),
  getCustomer: (id: string) => apiClient.get(`/crm/customers/${id}`),
  searchCustomers: (query: string) => apiClient.get('/crm/customers/search', { params: { q: query } }),
  createCustomer: (data: any) => apiClient.post('/crm/customers', data),
  updateCustomer: (id: string, data: any) => apiClient.put(`/crm/customers/${id}`, data),
  deleteCustomer: (id: string) => apiClient.delete(`/crm/customers/${id}`),

  // Leads
  getLeads: () => apiClient.get('/crm/leads'),
  getLead: (id: string) => apiClient.get(`/crm/leads/${id}`),
  createLead: (data: any) => apiClient.post('/crm/leads', data),
  updateLead: (id: string, data: any) => apiClient.put(`/crm/leads/${id}`, data),
  deleteLead: (id: string) => apiClient.delete(`/crm/leads/${id}`),
  convertLeadToCustomer: (id: string) => apiClient.post(`/crm/leads/${id}/convert`),
  assignLead: (id: string, userId: string) => apiClient.post(`/crm/leads/${id}/assign`, { userId }),
  addLeadActivity: (data: any) => apiClient.post('/crm/leads/activities', data),
  getLeadActivities: (id: string) => apiClient.get(`/crm/leads/${id}/activities`),

  // Opportunities
  getOpportunities: () => apiClient.get('/crm/opportunities'),
  getOpportunity: (id: string) => apiClient.get(`/crm/opportunities/${id}`),
  getOpportunityForecast: () => apiClient.get('/crm/opportunities/forecast'),
  createOpportunity: (data: any) => apiClient.post('/crm/opportunities', data),
  updateOpportunity: (id: string, data: any) => apiClient.put(`/crm/opportunities/${id}`, data),
  deleteOpportunity: (id: string) => apiClient.delete(`/crm/opportunities/${id}`),
  moveOpportunityStage: (id: string, stage: string) => apiClient.post(`/crm/opportunities/${id}/move-stage`, { stage }),

  // Contacts
  getContacts: (customerId: string) => apiClient.get(`/crm/contacts/customer/${customerId}`),
  getContact: (id: string) => apiClient.get(`/crm/contacts/${id}`),
  createContact: (data: any) => apiClient.post('/crm/contacts', data),
  updateContact: (id: string, data: any) => apiClient.put(`/crm/contacts/${id}`, data),
  deleteContact: (id: string) => apiClient.delete(`/crm/contacts/${id}`),

  // Activities
  getActivities: () => apiClient.get('/crm/activities'),
  getActivity: (id: string) => apiClient.get(`/crm/activities/${id}`),
  createActivity: (data: any) => apiClient.post('/crm/activities', data),
  updateActivity: (id: string, data: any) => apiClient.put(`/crm/activities/${id}`, data),
  deleteActivity: (id: string) => apiClient.delete(`/crm/activities/${id}`),

  // Quotes
  getQuotes: () => apiClient.get('/crm/quotes'),
  getQuote: (id: string) => apiClient.get(`/crm/quotes/${id}`),
  createQuote: (data: any) => apiClient.post('/crm/quotes', data),
  updateQuote: (id: string, data: any) => apiClient.put(`/crm/quotes/${id}`, data),
  deleteQuote: (id: string) => apiClient.delete(`/crm/quotes/${id}`),
  updateQuoteStatus: (id: string, status: string) => apiClient.put(`/crm/quotes/${id}/status`, { status }),
};
