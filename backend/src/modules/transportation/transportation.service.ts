import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentEntity, ShipmentStatus } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { CourierEntity } from './entities/courier.entity';
import { DeliveryRouteEntity, RouteStatus } from './entities/delivery-route.entity';
import type { CreateShipmentDto } from './dto/create-shipment.dto';
import { FinancialEventType, ShipmentDeliveredEvent } from '../accounting/events/financial.events';

@Injectable()
export class TransportationService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentItemEntity)
    private shipmentItemRepo: Repository<ShipmentItemEntity>,
    @InjectRepository(CourierEntity)
    private courierRepo: Repository<CourierEntity>,
    @InjectRepository(DeliveryRouteEntity)
    private routeRepo: Repository<DeliveryRouteEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  // Shipments
  async findAllShipments(
    tenantId: string,
    filters?: {
      status?: ShipmentStatus;
      courier_id?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ShipmentEntity[]> {
    const where: any = { tenant_id: tenantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.courier_id) {
      where.courier_id = filters.courier_id;
    }

    if (filters?.startDate && filters?.endDate) {
      where.created_at = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    }

    return this.shipmentRepo.find({
      where,
      relations: ['courier', 'items'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneShipment(
    id: string,
    tenantId: string,
  ): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['courier', 'items'],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async findShipmentByTracking(
    trackingNumber: string,
  ): Promise<ShipmentEntity> {
    const shipment = await this.shipmentRepo.findOne({
      where: { tracking_number: trackingNumber },
      relations: ['courier', 'items'],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async createShipment(
    data: CreateShipmentDto,
    tenantId: string,
  ): Promise<ShipmentEntity> {
    const trackingNumber = await this.generateTrackingNumber(tenantId);

    const totalCost =
      (data.shipping_cost || 0) + (data.insurance_cost || 0);

    const shipment = this.shipmentRepo.create({
      tenant_id: tenantId,
      tracking_number: trackingNumber,
      transaction_id: data.transaction_id,
      courier_id: data.courier_id,
      priority: data.priority,
      origin_name: data.origin_name,
      origin_address: data.origin_address,
      origin_city: data.origin_city,
      origin_postal_code: data.origin_postal_code,
      origin_phone: data.origin_phone,
      destination_name: data.destination_name,
      destination_address: data.destination_address,
      destination_city: data.destination_city,
      destination_postal_code: data.destination_postal_code,
      destination_phone: data.destination_phone,
      destination_latitude: data.destination_latitude,
      destination_longitude: data.destination_longitude,
      weight: data.weight,
      weight_unit: data.weight_unit,
      volume: data.volume,
      package_count: data.package_count,
      package_type: data.package_type,
      pickup_date: data.pickup_date ? new Date(data.pickup_date) : undefined,
      estimated_delivery_date: data.estimated_delivery_date
        ? new Date(data.estimated_delivery_date)
        : undefined,
      shipping_cost: data.shipping_cost || 0,
      insurance_cost: data.insurance_cost || 0,
      total_cost: totalCost,
      notes: data.notes,
      special_instructions: data.special_instructions,
      requires_signature: data.requires_signature,
      is_fragile: data.is_fragile,
      is_insured: data.is_insured,
      tracking_history: [
        {
          status: ShipmentStatus.PENDING,
          timestamp: new Date(),
          location: data.origin_address,
          notes: 'Shipment created',
        },
      ],
      items: data.items.map((item) =>
        this.shipmentItemRepo.create({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          weight: item.weight,
          description: item.description,
        }),
      ),
    });

    return this.shipmentRepo.save(shipment) as unknown as Promise<ShipmentEntity>;
  }

  async updateShipmentStatus(
    id: string,
    status: ShipmentStatus,
    tenantId: string,
    notes?: string,
    location?: string,
  ): Promise<ShipmentEntity> {
    const shipment = await this.findOneShipment(id, tenantId);

    shipment.status = status;

    // Add to tracking history
    const trackingEntry = {
      status,
      timestamp: new Date(),
      location: location || shipment.destination_address,
      notes: notes || `Status updated to ${status}`,
    };

    shipment.tracking_history = [
      ...(shipment.tracking_history || []),
      trackingEntry,
    ];

    // Update delivery date if delivered
    if (status === ShipmentStatus.DELIVERED) {
      shipment.actual_delivery_date = new Date();

      // Update courier stats
      if (shipment.courier_id) {
        await this.updateCourierStats(shipment.courier_id);
      }

      // Emit financial event
      const event = new ShipmentDeliveredEvent();
      event.tenantId = tenantId;
      event.shipmentId = shipment.id;
      event.trackingNumber = shipment.tracking_number;
      event.shippingCost = Number(shipment.shipping_cost || 0) + Number(shipment.insurance_cost || 0);
      event.date = new Date().toISOString().split('T')[0];
      this.eventEmitter.emit(FinancialEventType.SHIPMENT_DELIVERED, event);
    }

    return this.shipmentRepo.save(shipment);
  }

  async addProofOfDelivery(
    id: string,
    tenantId: string,
    data: {
      delivered_to: string;
      signature?: string;
      photos?: string[];
      notes?: string;
    },
  ): Promise<ShipmentEntity> {
    const shipment = await this.findOneShipment(id, tenantId);

    shipment.delivered_to = data.delivered_to;
    if (data.signature) shipment.delivery_signature = data.signature;
    if (data.photos) shipment.delivery_photos = data.photos;
    if (data.notes) shipment.delivery_notes = data.notes;
    shipment.status = ShipmentStatus.DELIVERED;
    shipment.actual_delivery_date = new Date();

    return this.shipmentRepo.save(shipment);
  }

  // Couriers
  async findAllCouriers(tenantId: string): Promise<CourierEntity[]> {
    return this.courierRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOneCourier(id: string, tenantId: string): Promise<CourierEntity> {
    const courier = await this.courierRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    return courier;
  }

  async createCourier(
    data: Partial<CourierEntity>,
    tenantId: string,
  ): Promise<CourierEntity> {
    const code = await this.generateCourierCode(tenantId);

    const courier = this.courierRepo.create({
      ...data,
      code,
      tenant_id: tenantId,
    });

    return this.courierRepo.save(courier);
  }

  async updateCourier(
    id: string,
    data: Partial<CourierEntity>,
    tenantId: string,
  ): Promise<CourierEntity> {
    const courier = await this.findOneCourier(id, tenantId);
    Object.assign(courier, data);
    return this.courierRepo.save(courier);
  }

  async deleteCourier(id: string, tenantId: string): Promise<void> {
    const courier = await this.findOneCourier(id, tenantId);

    // Check if courier has active shipments
    const activeShipments = await this.shipmentRepo.count({
      where: {
        courier_id: id,
        status: ShipmentStatus.IN_TRANSIT,
      },
    });

    if (activeShipments > 0) {
      throw new BadRequestException(
        'Cannot delete courier with active shipments',
      );
    }

    // Detach courier from non-active shipments before deleting
    await this.shipmentRepo.update({ courier_id: id }, { courier_id: null as any });

    // Delete any routes assigned to this courier
    await this.routeRepo.delete({ courier_id: id });

    await this.courierRepo.remove(courier);
  }

  // Delivery Routes
  async createRoute(
    tenantId: string,
    courierId: string,
    shipmentIds: string[],
    routeDate: Date,
  ): Promise<DeliveryRouteEntity> {
    const routeNumber = await this.generateRouteNumber(tenantId);

    const route = this.routeRepo.create({
      tenant_id: tenantId,
      route_number: routeNumber,
      courier_id: courierId,
      route_date: routeDate,
      shipment_ids: shipmentIds,
      total_stops: shipmentIds.length,
      completed_stops: 0,
    });

    // Update shipments to assign courier
    await this.shipmentRepo.update(
      { id: In(shipmentIds) },
      { courier_id: courierId },
    );

    return this.routeRepo.save(route);
  }

  async updateRouteStatus(
    id: string,
    status: RouteStatus,
    tenantId: string,
  ): Promise<DeliveryRouteEntity> {
    const route = await this.routeRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    route.status = status;

    if (status === RouteStatus.IN_PROGRESS && !route.start_time) {
      route.start_time = new Date();
    }

    if (status === RouteStatus.COMPLETED && !route.end_time) {
      route.end_time = new Date();

      if (route.start_time) {
        const duration =
          (route.end_time.getTime() - route.start_time.getTime()) / 3600000;
        route.actual_duration = duration;
      }
    }

    return this.routeRepo.save(route);
  }

  // Analytics
  async getShipmentAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const shipments = await this.shipmentRepo.find({
      where: {
        tenant_id: tenantId,
        created_at: Between(startDate, endDate),
      },
    });

    const analytics = {
      totalShipments: shipments.length,
      byStatus: {} as any,
      byPriority: {} as any,
      totalCost: 0,
      averageCost: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      deliveryRate: 0,
    };

    shipments.forEach((shipment) => {
      // Count by status
      analytics.byStatus[shipment.status] =
        (analytics.byStatus[shipment.status] || 0) + 1;

      // Count by priority
      analytics.byPriority[shipment.priority] =
        (analytics.byPriority[shipment.priority] || 0) + 1;

      // Total cost
      analytics.totalCost += Number(shipment.total_cost);

      // On-time delivery
      if (
        shipment.status === ShipmentStatus.DELIVERED &&
        shipment.actual_delivery_date &&
        shipment.estimated_delivery_date
      ) {
        if (
          shipment.actual_delivery_date <= shipment.estimated_delivery_date
        ) {
          analytics.onTimeDeliveries++;
        } else {
          analytics.lateDeliveries++;
        }
      }
    });

    analytics.averageCost =
      shipments.length > 0 ? analytics.totalCost / shipments.length : 0;

    const deliveredCount =
      analytics.byStatus[ShipmentStatus.DELIVERED] || 0;
    analytics.deliveryRate =
      shipments.length > 0 ? (deliveredCount / shipments.length) * 100 : 0;

    return analytics;
  }

  // Helper methods
  private async generateTrackingNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.shipmentRepo.count({
      where: { tenant_id: tenantId },
    });

    const sequence = String(count + 1).padStart(6, '0');

    return `TRK-${year}${month}-${sequence}`;
  }

  private async generateCourierCode(tenantId: string): Promise<string> {
    const count = await this.courierRepo.count({
      where: { tenant_id: tenantId },
    });

    return `COU-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateRouteNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const count = await this.routeRepo.count({
      where: { tenant_id: tenantId },
    });

    const sequence = String(count + 1).padStart(3, '0');

    return `RT-${year}${month}${day}-${sequence}`;
  }

  private async updateCourierStats(courierId: string): Promise<void> {
    const courier = await this.courierRepo.findOne({
      where: { id: courierId },
    });

    if (courier) {
      courier.total_deliveries += 1;
      await this.courierRepo.save(courier);
    }
  }
}
