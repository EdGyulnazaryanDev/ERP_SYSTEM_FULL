import apiClient from './client';

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum ShipmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum CourierType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum CourierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
}

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ShipmentItem {
  id?: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price?: number;
  weight?: number;
  description?: string;
}

export interface Shipment {
  id: string;
  tenant_id: string;
  tracking_number: string;
  transaction_id?: string;
  courier_id?: string;
  courier?: Courier;
  status: ShipmentStatus;
  priority: ShipmentPriority;
  origin_name: string;
  origin_address: string;
  origin_city?: string;
  origin_postal_code?: string;
  origin_phone?: string;
  destination_name: string;
  destination_address: string;
  destination_city?: string;
  destination_postal_code?: string;
  destination_phone?: string;
  destination_latitude?: number;
  destination_longitude?: number;
  weight: number;
  weight_unit: string;
  volume: number;
  package_count: number;
  package_type?: string;
  pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_cost: number;
  insurance_cost: number;
  total_cost: number;
  delivered_to?: string;
  delivery_signature?: string;
  delivery_photos?: string[];
  delivery_notes?: string;
  tracking_history?: Array<{
    status: string;
    timestamp: string;
    location: string;
    notes: string;
  }>;
  notes?: string;
  special_instructions?: string;
  requires_signature: boolean;
  is_fragile: boolean;
  is_insured: boolean;
  items: ShipmentItem[];
  created_at: string;
  updated_at: string;
}

export interface Courier {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  type: CourierType;
  status: CourierStatus;
  company_name?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  address?: string;
  base_rate: number;
  per_km_rate: number;
  total_deliveries: number;
  rating: number;
  working_hours?: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRoute {
  id: string;
  tenant_id: string;
  route_number: string;
  courier_id: string;
  courier?: Courier;
  status: RouteStatus;
  route_date: string;
  start_time?: string;
  end_time?: string;
  shipment_ids: string[];
  total_stops: number;
  completed_stops: number;
  total_distance: number;
  estimated_duration: number;
  actual_duration: number;
  route_coordinates?: any[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShipmentDto {
  transaction_id?: string;
  courier_id?: string;
  priority?: ShipmentPriority;
  origin_name: string;
  origin_address: string;
  origin_city?: string;
  origin_postal_code?: string;
  origin_phone?: string;
  destination_name: string;
  destination_address: string;
  destination_city?: string;
  destination_postal_code?: string;
  destination_phone?: string;
  destination_latitude?: number;
  destination_longitude?: number;
  weight?: number;
  weight_unit?: string;
  volume?: number;
  package_count?: number;
  package_type?: string;
  pickup_date?: string;
  estimated_delivery_date?: string;
  shipping_cost?: number;
  insurance_cost?: number;
  notes?: string;
  special_instructions?: string;
  requires_signature?: boolean;
  is_fragile?: boolean;
  is_insured?: boolean;
  items: ShipmentItem[];
}

export interface ShipmentAnalytics {
  totalShipments: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalCost: number;
  averageCost: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  deliveryRate: number;
}

export const transportationApi = {
  // Shipments
  getShipments: (params?: {
    status?: ShipmentStatus;
    courier_id?: string;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get<{ data: Shipment[]; total: number; page: number; limit: number }>('/transportation/shipments', { params }),

  getShipment: (id: string) =>
    apiClient.get<Shipment>(`/transportation/shipments/${id}`),

  trackShipment: (trackingNumber: string) =>
    apiClient.get<Shipment>(`/transportation/shipments/track/${trackingNumber}`),

  createShipment: (data: CreateShipmentDto) =>
    apiClient.post<Shipment>('/transportation/shipments', data),

  updateShipmentStatus: (
    id: string,
    data: { status: ShipmentStatus; notes?: string; location?: string }
  ) => apiClient.put<Shipment>(`/transportation/shipments/${id}/status`, data),

  addProofOfDelivery: (
    id: string,
    data: {
      delivered_to: string;
      signature?: string;
      photos?: string[];
      notes?: string;
    }
  ) =>
    apiClient.post<Shipment>(
      `/transportation/shipments/${id}/proof-of-delivery`,
      data
    ),

  getShipmentAnalytics: (startDate: string, endDate: string) =>
    apiClient.get<ShipmentAnalytics>('/transportation/shipments/analytics', {
      params: { startDate, endDate },
    }),

  // Document downloads (staff — by shipment ID)
  getPackingSlipUrl: (id: string) =>
    `${apiClient.defaults.baseURL}/transportation/shipments/${id}/packing-slip`,

  getDeliveryConfirmationUrl: (id: string) =>
    `${apiClient.defaults.baseURL}/transportation/shipments/${id}/delivery-confirmation`,

  // Document downloads (portal — by tracking number, requires portal JWT)
  getPortalPackingSlipUrl: (trackingNumber: string) =>
    `${apiClient.defaults.baseURL}/transportation/shipments/track/${trackingNumber}/packing-slip`,

  getPortalDeliveryConfirmationUrl: (trackingNumber: string) =>
    `${apiClient.defaults.baseURL}/transportation/shipments/track/${trackingNumber}/delivery-confirmation`,

  downloadDocument: async (url: string): Promise<Blob> => {
    const token = (await import('@/store/authStore')).useAuthStore.getState().token;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Failed to download document');
    return response.blob();
  },

  // Couriers
  getCouriers: () => apiClient.get<Courier[]>('/transportation/couriers'),

  getCourier: (id: string) =>
    apiClient.get<Courier>(`/transportation/couriers/${id}`),

  createCourier: (data: Partial<Courier>) =>
    apiClient.post<Courier>('/transportation/couriers', data),

  updateCourier: (id: string, data: Partial<Courier>) =>
    apiClient.put<Courier>(`/transportation/couriers/${id}`, data),

  deleteCourier: (id: string) =>
    apiClient.delete(`/transportation/couriers/${id}`),

  // Routes
  createRoute: (data: {
    courier_id: string;
    shipment_ids: string[];
    route_date: string;
  }) => apiClient.post<DeliveryRoute>('/transportation/routes', data),

  updateRouteStatus: (id: string, status: RouteStatus) =>
    apiClient.put<DeliveryRoute>(`/transportation/routes/${id}/status`, {
      status,
    }),
};
