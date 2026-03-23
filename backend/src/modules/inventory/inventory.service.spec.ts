import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryEntity } from './entities/inventory.entity';
import { PurchaseRequisitionEntity } from '../procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../procurement/entities/purchase-requisition-item.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: jest.Mocked<Repository<InventoryEntity>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockInventory: InventoryEntity = {
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
    reorder_quantity: 50,
    supplier_id: null,
    supplier: null,
    supplier_name: null,
    max_stock_level: 500,
    location: 'Warehouse A',
    warehouse: 'Main',
    created_at: new Date(),
    updated_at: new Date(),
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
        {
          provide: getRepositoryToken(PurchaseRequisitionEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PurchaseRequisitionItemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionItemEntity),
          useValue: {
            create: jest.fn(),
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

    service = module.get(InventoryService);
    inventoryRepo = module.get(getRepositoryToken(InventoryEntity));
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findOne throws when inventory is missing', async () => {
    inventoryRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects duplicate SKUs on create', async () => {
    inventoryRepo.findOne.mockResolvedValue(mockInventory);

    await expect(
      service.create(
        {
          product_name: 'Duplicate',
          sku: mockInventory.sku,
          quantity: 1,
          unit_cost: 1,
          unit_price: 1,
        },
        'tenant-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('emits an OUT movement for downward adjustments', async () => {
    inventoryRepo.findOne.mockResolvedValue(mockInventory);
    inventoryRepo.save.mockResolvedValue({
      ...mockInventory,
      quantity: 60,
      available_quantity: 50,
    });

    await service.adjustStock(
      'inv-1',
      60,
      'ADJUSTMENT',
      'tenant-1',
      'COUNT-001',
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'stock.moved',
      expect.objectContaining({
        movementType: 'OUT',
        quantity: 40,
        reference: 'COUNT-001',
      }),
    );
  });
});
