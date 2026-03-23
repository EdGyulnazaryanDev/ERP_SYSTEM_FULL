import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { AccountingService } from '../accounting/accounting.service';
import { JournalEntryStatus } from '../accounting/entities/journal-entry.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepo: jest.Mocked<Repository<TransactionEntity>>;
  let itemRepo: jest.Mocked<Repository<TransactionItemEntity>>;
  let inventoryRepo: jest.Mocked<Repository<InventoryEntity>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let accountingService: jest.Mocked<AccountingService>;

  const mockTransaction: TransactionEntity = {
    id: 'txn-1',
    tenant_id: 'tenant-1',
    transaction_number: 'SAL-202603-00001',
    type: TransactionType.SALE,
    status: TransactionStatus.DRAFT,
    customer_id: 'customer-1',
    customer_name: 'Customer 1',
    supplier_id: null,
    supplier_name: null,
    transaction_date: new Date('2026-03-22'),
    due_date: null,
    subtotal: 100,
    tax_amount: 0,
    tax_rate: 0,
    discount_amount: 0,
    shipping_amount: 0,
    total_amount: 100,
    paid_amount: 0,
    balance_amount: 100,
    payment_method: null,
    notes: null,
    terms: null,
    items: [
      {
        id: 'item-1',
        transaction_id: 'txn-1',
        product_id: 'prod-1',
        product_name: 'Product 1',
        sku: 'SKU-1',
        quantity: 2,
        unit_price: 50,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 100,
        notes: null,
        transaction: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockInventory: InventoryEntity = {
    id: 'inv-1',
    tenant_id: 'tenant-1',
    product_id: 'prod-1',
    product_name: 'Product 1',
    sku: 'SKU-1',
    quantity: 10,
    reserved_quantity: 0,
    available_quantity: 10,
    unit_cost: 20,
    unit_price: 50,
    reorder_level: 1,
    reorder_quantity: 5,
    supplier_id: null,
    supplier: null,
    supplier_name: null,
    max_stock_level: 100,
    location: null,
    warehouse: null,
    created_at: new Date(),
    updated_at: new Date(),
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
          },
        },
        {
          provide: getRepositoryToken(TransactionItemEntity),
          useValue: {
            create: jest.fn(),
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
        {
          provide: AccountingService,
          useValue: {
            findJournalEntriesByReference: jest.fn(),
            reverseJournalEntry: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    transactionRepo = module.get(getRepositoryToken(TransactionEntity));
    itemRepo = module.get(getRepositoryToken(TransactionItemEntity));
    inventoryRepo = module.get(getRepositoryToken(InventoryEntity));
    eventEmitter = module.get(EventEmitter2);
    accountingService = module.get(AccountingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findOne throws when transaction is missing', async () => {
    transactionRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('completes a purchase without emitting a duplicate bill event', async () => {
    const purchase = {
      ...mockTransaction,
      id: 'txn-purchase',
      transaction_number: 'PUR-202603-00001',
      type: TransactionType.PURCHASE,
      customer_id: null,
      customer_name: null,
      supplier_id: 'supplier-1',
      supplier_name: 'Supplier 1',
      status: TransactionStatus.DRAFT,
    };

    transactionRepo.findOne.mockResolvedValue(purchase);
    inventoryRepo.findOne
      .mockResolvedValueOnce(mockInventory)
      .mockResolvedValueOnce(null);
    inventoryRepo.save.mockResolvedValue({
      ...mockInventory,
      quantity: 12,
      available_quantity: 12,
    });
    transactionRepo.save.mockResolvedValue({
      ...purchase,
      status: TransactionStatus.COMPLETED,
    } as TransactionEntity);

    await service.complete(purchase.id, 'tenant-1');

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'stock.moved',
      expect.objectContaining({
        movementType: 'IN',
        reference: purchase.transaction_number,
      }),
    );
  });

  it('cancels a completed sale by restoring stock and reversing posted entries', async () => {
    const completedSale = {
      ...mockTransaction,
      status: TransactionStatus.COMPLETED,
    };

    transactionRepo.findOne.mockResolvedValue(completedSale);
    inventoryRepo.findOne.mockResolvedValue(mockInventory);
    inventoryRepo.save.mockResolvedValue({
      ...mockInventory,
      quantity: 12,
      available_quantity: 12,
    });
    accountingService.findJournalEntriesByReference.mockResolvedValue([
      {
        id: 'je-1',
        status: JournalEntryStatus.POSTED,
        reversed_entry_id: null,
      } as any,
      {
        id: 'je-2',
        status: JournalEntryStatus.REVERSED,
        reversed_entry_id: 'je-3',
      } as any,
    ]);
    accountingService.reverseJournalEntry.mockResolvedValue({} as any);
    transactionRepo.save.mockResolvedValue({
      ...completedSale,
      status: TransactionStatus.CANCELLED,
    } as TransactionEntity);

    const result = await service.cancel(completedSale.id, 'tenant-1');

    expect(inventoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 14,
        available_quantity: 14,
      }),
    );
    expect(accountingService.reverseJournalEntry).toHaveBeenCalledTimes(1);
    expect(accountingService.reverseJournalEntry).toHaveBeenCalledWith(
      'je-1',
      expect.objectContaining({
        reason: `Transaction ${completedSale.transaction_number} cancelled`,
      }),
      'tenant-1',
    );
    expect(result.status).toBe(TransactionStatus.CANCELLED);
  });

  it('updates a draft transaction', async () => {
    const updateDto = {
      type: TransactionType.SALE,
      transaction_date: new Date('2026-03-22').toISOString(),
      items: [],
    };

    transactionRepo.findOne.mockResolvedValue(mockTransaction);
    itemRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
    transactionRepo.save.mockResolvedValue(mockTransaction);

    await service.update('txn-1', updateDto as any, 'tenant-1');

    expect(itemRepo.delete).toHaveBeenCalledWith({ transaction_id: 'txn-1' });
    expect(transactionRepo.save).toHaveBeenCalled();
  });
});
