import { Test, TestingModule } from '@nestjs/testing';
import { TransportationService } from './transportation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import {
  ShipmentEntity,
  ShipmentStatus,
  ShipmentPriority,
} from './entities/shipment.entity';
import {
  CourierEntity,
  CourierStatus,
  CourierType,
} from './entities/courier.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { DeliveryRouteEntity } from './entities/delivery-route.entity';
import { NotFoundException } from '@nestjs/common';

describe('TransportationService', () => {
  let service: TransportationService;
  let shipmentRepo: jest.Mocked<Repository<ShipmentEntity>>;
  let courierRepo: jest.Mocked<Repository<CourierEntity>>;
  let shipmentItemRepo: jest.Mocked<Repository<ShipmentItemEntity>>;
  let routeRepo: jest.Mocked<Repository<DeliveryRouteEntity>>;

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
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
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
          },
        },
      ],
    }).compile();

    service = module.get<TransportationService>(TransportationService);
    shipmentRepo = module.get(getRepositoryToken(ShipmentEntity));
    courierRepo = module.get(getRepositoryToken(CourierEntity));
    shipmentItemRepo = module.get(getRepositoryToken(ShipmentItemEntity));
    routeRepo = module.get(getRepositoryToken(DeliveryRouteEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllShipments', () => {
    it('should return all shipments for tenant', async () => {
      const shipments = [mockShipment];
      shipmentRepo.find.mockResolvedValue(shipments);

      const result = await service.findAllShipments('tenant-1');

      expect(result).toEqual(shipments);
      expect(shipmentRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        relations: ['courier', 'items'],
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOneShipment', () => {
    it('should return shipment by id', async () => {
      shipmentRepo.findOne.mockResolvedValue(mockShipment);

      const result = await service.findOneShipment('shipment-1', 'tenant-1');

      expect(result).toEqual(mockShipment);
      expect(shipmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'shipment-1', tenant_id: 'tenant-1' },
        relations: ['courier', 'items'],
      });
    });

    it('should throw NotFoundException if shipment not found', async () => {
      shipmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneShipment('shipment-999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createShipment', () => {
    it('should create shipment successfully', async () => {
      const createDto = {
        courier_id: 'courier-1',
        origin_name: 'Warehouse',
        origin_address: '123 Main St',
        destination_name: 'Customer',
        destination_address: '456 Oak Ave',
        weight: 10,
        items: [],
      };

      const newShipment = { ...mockShipment };
      shipmentRepo.count.mockResolvedValue(0);
      shipmentRepo.create.mockReturnValue(newShipment);
      shipmentRepo.save.mockResolvedValue(newShipment);
      shipmentItemRepo.create.mockImplementation((data) => data as ShipmentItemEntity);

      const result = await service.createShipment(createDto as any, 'tenant-1');

      expect(result).toEqual(newShipment);
      expect(shipmentRepo.count).toHaveBeenCalled();
      expect(shipmentRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update shipment status successfully', async () => {
      const updated = { ...mockShipment, status: ShipmentStatus.IN_TRANSIT };

      shipmentRepo.findOne.mockResolvedValue(mockShipment);
      shipmentRepo.save.mockResolvedValue(updated);

      const result = await service.updateShipmentStatus(
        'shipment-1',
        ShipmentStatus.IN_TRANSIT,
        'tenant-1',
      );

      expect(result.status).toBe(ShipmentStatus.IN_TRANSIT);
      expect(shipmentRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllCouriers', () => {
    it('should return all couriers for tenant', async () => {
      const couriers = [mockCourier];
      courierRepo.find.mockResolvedValue(couriers);

      const result = await service.findAllCouriers('tenant-1');

      expect(result).toEqual(couriers);
      expect(courierRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOneCourier', () => {
    it('should return courier by id', async () => {
      courierRepo.findOne.mockResolvedValue(mockCourier);

      const result = await service.findOneCourier('courier-1', 'tenant-1');

      expect(result).toEqual(mockCourier);
    });

    it('should throw NotFoundException if courier not found', async () => {
      courierRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneCourier('courier-999', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCourier', () => {
    it('should create courier successfully', async () => {
      const createDto = {
        name: 'Jane Smith',
        code: 'C002',
        phone: '555-5678',
      };

      const newCourier = { ...mockCourier, ...createDto };
      courierRepo.count.mockResolvedValue(0);
      courierRepo.create.mockReturnValue(newCourier);
      courierRepo.save.mockResolvedValue(newCourier);

      const result = await service.createCourier(createDto as any, 'tenant-1');

      expect(result).toEqual(newCourier);
      expect(courierRepo.count).toHaveBeenCalled();
      expect(courierRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateCourier', () => {
    it('should update courier successfully', async () => {
      const updateDto = { status: CourierStatus.ON_LEAVE };
      const updated = { ...mockCourier, ...updateDto };

      courierRepo.findOne.mockResolvedValue(mockCourier);
      courierRepo.save.mockResolvedValue(updated);

      const result = await service.updateCourier(
        'courier-1',
        updateDto as any,
        'tenant-1',
      );

      expect(result.status).toBe(CourierStatus.ON_LEAVE);
      expect(courierRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteCourier', () => {
    it('should delete courier successfully', async () => {
      courierRepo.findOne.mockResolvedValue(mockCourier);
      shipmentRepo.count.mockResolvedValue(0);
      courierRepo.remove.mockResolvedValue(mockCourier);

      await service.deleteCourier('courier-1', 'tenant-1');

      expect(shipmentRepo.count).toHaveBeenCalledWith({
        where: {
          courier_id: 'courier-1',
          status: ShipmentStatus.IN_TRANSIT,
        },
      });
      expect(courierRepo.remove).toHaveBeenCalledWith(mockCourier);
    });
  });
});
