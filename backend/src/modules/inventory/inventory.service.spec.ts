import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryEntity } from './entities/inventory.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: Repository<InventoryEntity>;

  const mockInventory = {
    id: 'inv-1',
    tenant_id: 'tenant-1',
    product_id: 'prod-1',
    product_name: 'Test Product',
    sku: 'TEST-001',
    quantity: 100,
    reserved_quantity: 10,
    available_quantity: 90,
    unit_cost: 10.5,
    unit_price: 15.99,
    reorder_level: 20,
    max_stock_level: 500,
    location: 'Warehouse A',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repository = module.get(getRepositoryToken(InventoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all inventory items for tenant', async () => {
      const items = [mockInventory];
      jest.spyOn(repository, 'find').mockResolvedValue(items as any);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(items);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { product_name: 'ASC' },
      });
    });

    it('should return empty array if no items found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return inventory item by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventory as any);

      const result = await service.findOne('inv-1', 'tenant-1');

      expect(result).toEqual(mockInventory);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'inv-1', tenant_id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('inv-999', 'tenant-1')).rejects.toThrow(NotFoundException);
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

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue({ ...createDto, tenant_id: 'tenant-1' } as any);
      jest.spyOn(repository, 'save').mockResolvedValue({ ...createDto, id: 'inv-new' } as any);

      const result = await service.create(createDto, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const createDto = {
        product_name: 'New Product',
        sku: 'TEST-001',
        quantity: 50,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventory as any);

      await expect(service.create(createDto, 'tenant-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update inventory item successfully', async () => {
      const updateDto = { quantity: 150, reserved_quantity: 20 };
      const updated = { ...mockInventory, ...updateDto, available_quantity: 130 };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventory as any);
      jest.spyOn(repository, 'save').mockResolvedValue(updated as any);

      const result = await service.update('inv-1', updateDto, 'tenant-1');

      expect(result.available_quantity).toBe(130);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.update('inv-999', {}, 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete inventory item successfully', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventory as any);
      jest.spyOn(repository, 'remove').mockResolvedValue(mockInventory as any);

      await service.delete('inv-1', 'tenant-1');

      expect(repository.remove).toHaveBeenCalledWith(mockInventory);
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete('inv-999', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLowStock', () => {
    it('should return items with low stock', async () => {
      const lowStockItem = { ...mockInventory, available_quantity: 5, reorder_level: 20 };
      jest.spyOn(repository, 'find').mockResolvedValue([lowStockItem] as any);

      const result = await service.findLowStock('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].available_quantity).toBeLessThanOrEqual(result[0].reorder_level);
    });
  });

  describe('getStockSummary', () => {
    it('should return stock summary', async () => {
      const items = [
        mockInventory,
        { ...mockInventory, id: 'inv-2', available_quantity: 0 },
        { ...mockInventory, id: 'inv-3', available_quantity: 5, reorder_level: 20 },
      ];
      jest.spyOn(repository, 'find').mockResolvedValue(items as any);

      const result = await service.getStockSummary('tenant-1');

      expect(result.totalItems).toBe(3);
      expect(result.outOfStockItems).toBe(1);
      expect(result.lowStockItems).toBe(1);
      expect(result.totalQuantity).toBeGreaterThan(0);
    });
  });
});
