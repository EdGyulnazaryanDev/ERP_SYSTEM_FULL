import apiClient from './client';

export const procurementApi = {
  // Purchase Requisitions
  getRequisitions: () => apiClient.get('/procurement/requisitions'),
  getRequisition: (id: string) => apiClient.get(`/procurement/requisitions/${id}`),
  createRequisition: (data: any) => apiClient.post('/procurement/requisitions', data),
  updateRequisition: (id: string, data: any) => apiClient.put(`/procurement/requisitions/${id}`, data),
  deleteRequisition: (id: string) => apiClient.delete(`/procurement/requisitions/${id}`),
  approveRequisition: (id: string, data: any) => apiClient.post(`/procurement/requisitions/${id}/approve`, data),
  rejectRequisition: (id: string, data: any) => apiClient.post(`/procurement/requisitions/${id}/reject`, data),

  // RFQs
  getRfqs: () => apiClient.get('/procurement/rfqs'),
  getRfq: (id: string) => apiClient.get(`/procurement/rfqs/${id}`),
  createRfq: (data: any) => apiClient.post('/procurement/rfqs', data),
  updateRfq: (id: string, data: any) => apiClient.put(`/procurement/rfqs/${id}`, data),
  deleteRfq: (id: string) => apiClient.delete(`/procurement/rfqs/${id}`),

  // Vendor Quotes
  getVendorQuotes: (rfqId?: string) => apiClient.get('/procurement/vendor-quotes', { params: { rfqId } }),
  getVendorQuote: (id: string) => apiClient.get(`/procurement/vendor-quotes/${id}`),
  createVendorQuote: (data: any) => apiClient.post('/procurement/vendor-quotes', data),
  updateVendorQuote: (id: string, data: any) => apiClient.put(`/procurement/vendor-quotes/${id}`, data),
  deleteVendorQuote: (id: string) => apiClient.delete(`/procurement/vendor-quotes/${id}`),

  // Purchase Orders
  getPurchaseOrders: () => apiClient.get('/procurement/purchase-orders'),
  getPurchaseOrder: (id: string) => apiClient.get(`/procurement/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => apiClient.post('/procurement/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: any) => apiClient.put(`/procurement/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id: string) => apiClient.delete(`/procurement/purchase-orders/${id}`),
  approvePurchaseOrder: (id: string, data: any) => apiClient.post(`/procurement/purchase-orders/${id}/approve`, data),

  // Goods Receipts
  getGoodsReceipts: () => apiClient.get('/procurement/goods-receipts'),
  getGoodsReceipt: (id: string) => apiClient.get(`/procurement/goods-receipts/${id}`),
  createGoodsReceipt: (data: any) => apiClient.post('/procurement/goods-receipts', data),
  updateGoodsReceipt: (id: string, data: any) => apiClient.put(`/procurement/goods-receipts/${id}`, data),
  deleteGoodsReceipt: (id: string) => apiClient.delete(`/procurement/goods-receipts/${id}`),
  approveGoodsReceipt: (id: string, data: any) => apiClient.post(`/procurement/goods-receipts/${id}/approve`, data),
};
