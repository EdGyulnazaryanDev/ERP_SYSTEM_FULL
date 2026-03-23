import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransportationService } from './transportation.service';
import {
  ShipmentEntity,
  ShipmentPriority,
  ShipmentStatus,
} from './entities/shipment.entity';
import {
  CourierEntity,
  CourierStatus,
  CourierType,
} from './entities/courier.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { DeliveryRouteEntity } from './entities/delivery-route.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';

describe('TransportationService', () => {
  let service: TransportationService;
  let shipmentRepo: jest.Mocked<Repository<ShipmentEntity>>;
  let courierRepo: jest.Mocked<Repository<CourierEntity>>;
  let shipmentItemRepo: jest.Mocked<Repository<ShipmentItemEntity>>;
  let routeRepo: jest.Mocked<Repository<DeliveryRouteEntity>>;
  let inventoryRepo: jest.Mocked<Repository<InventoryEntity>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockShipment: ShipmentEntity = {
    id: 'shipment-1',
    tenant_id: 'tenant-1',
    tracking_number: 'TRK001',
    transaction_id: null,
    courier_id: 'courier-1',
    courier: null,
    status: ShipmentStatus.PENDING,
    priority: ShipmentPriority.NORMAL,
    origin_name: 'Warehouse A',
    origin_address: '123 Main St',
    origin_city: 'New York',
    origin_postal_code: '10001',
    origin_phone: '555-0001',
    destination_name: 'Customer',
    destination_address: '456 Oak Ave',
    destination_city: 'Boston',
    destination_postal_code: '02101',
    destination_phone: '555-0002',
    destination_latitude: null,
    destination_longitude: null,
    weight: 10,
    weight_unit: 'kg',
    volume: 0.5,
    package_count: 1,
    package_type: 'Box',
    pickup_date: null,
    estimated_delivery_date: null,
    actual_delivery_date: null,
    shipping_cost: 50,
    insurance_cost: 5,
    total_cost: 55,
    delivered_to: null,
    delivery_signature: null,
    delivery_photos: null,
    delivery_notes: null,
    tracking_history: [],
    notes: null,
    special_instructions: null,
    requires_signature: false,
    is_fragile: false,
    is_insured: false,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCourier: CourierEntity = {
    id: 'courier-1',
    tenant_id: 'tenant-1',
    name: 'John Doe',
    code: 'C001',
    type: CourierType.INTERNAL,
    status: CourierStatus.ACTIVE,
    company_name: null,
    phone: '555-1234',
    email: 'john@example.com',
    license_number: 'LIC123',
    vehicle_number: 'VEH001',
    vehicle_type: 'Van',
    address: null,
    base_rate: 20,
    per_km_rate: 2,
    total_deliveries: 0,
    rating: 0,
    working_hours: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportationService,
        {
          provide: getRepositoryToken(ShipmentEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CourierEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ShipmentItemEntity),
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DeliveryRouteEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TransportationService);
    shipmentRepo = module.get(getRepositoryToken(ShipmentEntity));
    courierRepo = module.get(getRepositoryToken(CourierEntity));
    shipmentItemRepo = module.get(getRepositoryToken(ShipmentItemEntity));
    routeRepo = module.get(getRepositoryToken(DeliveryRouteEntity));
    inventoryRepo = module.get(getRepositoryToken(InventoryEntity));
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findOneShipment throws when missing', async () => {
    shipmentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findOneShipment('missing', 'tenant-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a shipment', async () => {
    shipmentRepo.count.mockResolvedValue(0);
    shipmentRepo.create.mockReturnValue(mockShipment);
    shipmentRepo.save.mockResolvedValue(mockShipment);
    shipmentItemRepo.create.mockImplementation((data) => data as ShipmentItemEntity);

    const result = await service.createShipment(
      {
        courier_id: 'courier-1',
        origin_name: 'Warehouse',
        origin_address: '123 Main St',
        destination_name: 'Customer',
        destination_address: '456 Oak Ave',
        weight: 10,
        items: [],
      } as any,
      'tenant-1',
    );

    expect(result).toEqual(mockShipment);
    expect(shipmentRepo.save).toHaveBeenCalled();
  });

  it('processes delivery side effects only once', async () => {
    const deliveredShipment = {
      ...mockShipment,
      status: ShipmentStatus.DELIVERED,
      actual_delivery_date: new Date(),
    };

    jest
      .spyOn(service as any, 'updateCourierStats')
      .mockResolvedValue(undefined);
    shipmentRepo.findOne
      .mockResolvedValueOnce(mockShipment)
      .mockResolvedValueOnce(deliveredShipment);
    shipmentRepo.save.mockResolvedValue(deliveredShipment);

    await service.updateShipmentStatus(
      'shipment-1',
      ShipmentStatus.DELIVERED,
      'tenant-1',
    );
    await service.updateShipmentStatus(
      'shipment-1',
      ShipmentStatus.DELIVERED,
      'tenant-1',
    );

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'shipment.delivered',
      expect.objectContaining({ trackingNumber: mockShipment.tracking_number }),
    );
  });

  it('adds proof of delivery and triggers the delivery chain on first delivery', async () => {
    const pendingShipment = {
      ...mockShipment,
      status: ShipmentStatus.PENDING,
      tracking_history: [],
    };
    const updateCourierStatsSpy = jest
      .spyOn(service as any, 'updateCourierStats')
      .mockResolvedValue(undefined);
    const savedShipment = {
      ...mockShipment,
      status: ShipmentStatus.DELIVERED,
      delivered_to: 'Receiver',
      actual_delivery_date: new Date(),
      tracking_history: [
        expect.objectContaining({ status: ShipmentStatus.DELIVERED }),
      ],
    } as any;

    shipmentRepo.findOne.mockResolvedValue(pendingShipment);
    shipmentRepo.save.mockResolvedValue(savedShipment);

    const result = await service.addProofOfDelivery('shipment-1', 'tenant-1', {
      delivered_to: 'Receiver',
      notes: 'Signed at front desk',
    });

    expect(result.status).toBe(ShipmentStatus.DELIVERED);
    expect(updateCourierStatsSpy).toHaveBeenCalledWith(pendingShipment.courier_id);
    expect(shipmentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        delivered_to: 'Receiver',
        status: ShipmentStatus.DELIVERED,
      }),
    );
  });

  it('deletes a courier with no active shipments', async () => {
    courierRepo.findOne.mockResolvedValue(mockCourier);
    shipmentRepo.count.mockResolvedValue(0);
    shipmentRepo.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });
    routeRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);
    courierRepo.remove.mockResolvedValue(mockCourier);

    await service.deleteCourier('courier-1', 'tenant-1');

    expect(shipmentRepo.update).toHaveBeenCalledWith(
      { courier_id: 'courier-1' },
      { courier_id: null },
    );
    expect(routeRepo.delete).toHaveBeenCalledWith({ courier_id: 'courier-1' });
    expect(courierRepo.remove).toHaveBeenCalledWith(mockCourier);
  });
});
