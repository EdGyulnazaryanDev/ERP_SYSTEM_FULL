import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { BadRequestException } from '@nestjs/common';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventory = {
    id: 'inv-1',
    tenant_id: 'tenant-1',
    product_name: 'Test Product',
    sku: 'TEST-001',
    quantity: 100,
    unit_cost: 10.5,
    unit_price: 15.99,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findLowStock: jest.fn(),
            getStockSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all inventory items', async () => {
      const items = [mockInventory];
      jest.spyOn(service, 'findAll').mockResolvedValue(items as any);

      const result = await controller.findAll('tenant-1');

      expect(result).toEqual(items);
      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('findOne', () => {
    it('should return single inventory item', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockInventory as any);

      const result = await controller.findOne('inv-1', 'tenant-1');

      expect(result).toEqual(mockInventory);
    });
  });

  describe('create', () => {
    it('should create inventory item successfully', async () => {
      const createDto = {
        product_name: 'New Product',
        sku: 'NEW-001',
        quantity: 50,
        unit_cost: 10,
        unit_price: 15,
      };

      jest.spyOn(service, 'create').mockResolvedValue({ ...createDto, id: 'inv-new' } as any);

      const result = await controller.create(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
    });

    it('should throw BadRequestException if required fields missing', async () => {
      const invalidDto = { quantity: 50 };

      await expect(controller.create(invalidDto as any, 'tenant-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if numeric fields are invalid', async () => {
      const invalidDto = {
        product_name: 'Test',
        sku: 'TEST',
        quantity: 'invalid',
      };

      await expect(controller.create(invalidDto as any, 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update inventory item successfully', async () => {
      const updateDto = { quantity: 150 };
      const updated = { ...mockInventory, ...updateDto };

      jest.spyOn(service, 'update').mockResolvedValue(updated as any);

      const result = await controller.update('inv-1', updateDto as any, 'tenant-1');

      expect(result.quantity).toBe(150);
    });
  });

  describe('delete', () => {
    it('should delete inventory item successfully', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(undefined);

      const result = await controller.delete('inv-1', 'tenant-1');

      expect(result).toEqual({ message: 'Inventory item deleted successfully' });
    });
  });

  describe('findLowStock', () => {
    it('should return low stock items', async () => {
      const lowStockItems = [mockInventory];
      jest.spyOn(service, 'findLowStock').mockResolvedValue(lowStockItems as any);

      const result = await controller.findLowStock('tenant-1');

      expect(result).toEqual(lowStockItems);
    });
  });

  describe('getStockSummary', () => {
    it('should return stock summary', async () => {
      const summary = {
        totalItems: 10,
        totalQuantity: 500,
        totalValue: 5000,
        lowStockItems: 2,
        outOfStockItems: 1,
      };
      jest.spyOn(service, 'getStockSummary').mockResolvedValue(summary);

      const result = await controller.getStockSummary('tenant-1');

      expect(result).toEqual(summary);
    });
  });
});
