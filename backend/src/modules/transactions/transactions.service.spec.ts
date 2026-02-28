import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepo: jest.Mocked<Repository<TransactionEntity>>;
  let itemRepo: jest.Mocked<Repository<TransactionItemEntity>>;
  let inventoryRepo: jest.Mocked<Repository<InventoryEntity>>;

  const mockTransaction: Partial<TransactionEntity> = {
    id: 'txn-1',
    tenant_id: 'tenant-1',
    type: 'sale',
    transaction_date: new Date(),
    total_amount: 100.50,
    status: 'draft',
    transaction_number: 'TXN-001',
  };

  const mockItem: Partial<TransactionItemEntity> = {
    id: 'item-1',
    transaction_id: 'txn-1',
    product_id: 'prod-1',
    quantity: 2,
    unit_price: 50.25,
    total_price: 100.50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(TransactionItemEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepo = module.get(getRepositoryToken(TransactionEntity));
    itemRepo = module.get(getRepositoryToken(TransactionItemEntity));
    inventoryRepo = module.get(getRepositoryToken(InventoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      const transactions = [mockTransaction];
      transactionRepo.find.mockResolvedValue(transactions as TransactionEntity[]);

      const result = await service.findAll('tenant-1', {});

      expect(result).toEqual(transactions);
      expect(transactionRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return transaction with items', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction as TransactionEntity);

      const result = await service.findOne('txn-1', 'tenant-1');

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'txn-1', tenant_id: 'tenant-1' },
        relations: ['items'],
      });
    });

    it('should throw NotFoundException if transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('txn-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create transaction with items', async () => {
      const createDto = {
        type: 'sale',
        transaction_date: new Date().toISOString(),
        total_amount: 100.50,
        items: [
          {
            product_id: 'prod-1',
            product_name: 'Product 1',
            quantity: 2,
            unit_price: 50.25,
          },
        ],
      };

      const newTransaction = { ...mockTransaction, items: [mockItem] };
      transactionRepo.count.mockResolvedValue(0);
      transactionRepo.create.mockReturnValue(newTransaction as TransactionEntity);
      transactionRepo.save.mockResolvedValue(newTransaction as TransactionEntity);
      itemRepo.create.mockImplementation((data) => data as TransactionItemEntity);

      const result = await service.create(createDto as any, 'tenant-1');

      expect(result).toEqual(newTransaction);
      expect(transactionRepo.count).toHaveBeenCalled();
      expect(transactionRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update transaction successfully', async () => {
      const updateDto = { 
        type: 'sale',
        transaction_date: new Date().toISOString(),
        items: [],
      };
      const updated = { ...mockTransaction, status: 'draft' };

      transactionRepo.findOne.mockResolvedValue(updated as TransactionEntity);
      transactionRepo.save.mockResolvedValue(updated as TransactionEntity);
      itemRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
      itemRepo.create.mockImplementation((data) => data as TransactionItemEntity);

      const result = await service.update('txn-1', updateDto as any, 'tenant-1');

      expect(result).toBeDefined();
      expect(transactionRepo.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete transaction successfully', async () => {
      const draftTransaction = { ...mockTransaction, status: 'draft' };
      transactionRepo.findOne.mockResolvedValue(draftTransaction as TransactionEntity);
      transactionRepo.remove.mockResolvedValue(draftTransaction as TransactionEntity);

      await service.delete('txn-1', 'tenant-1');

      expect(transactionRepo.remove).toHaveBeenCalledWith(draftTransaction);
    });
  });
});
