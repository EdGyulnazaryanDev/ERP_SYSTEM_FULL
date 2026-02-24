import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  TransactionEntity,
  TransactionType,
  TransactionStatus,
} from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import type { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionItemEntity)
    private transactionItemRepo: Repository<TransactionItemEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
  ) {}

  async create(
    data: CreateTransactionDto,
    tenantId: string,
  ): Promise<TransactionEntity> {
    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(
      tenantId,
      data.type,
    );

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const itemsData = data.items.map((item) => {
      const itemTotal =
        item.quantity * item.unit_price - (item.discount_amount || 0);
      const itemTax = item.tax_amount || 0;

      subtotal += itemTotal;
      taxAmount += itemTax;

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount || 0,
        tax_amount: itemTax,
        total_amount: itemTotal + itemTax,
        notes: item.notes,
      };
    });

    const totalAmount =
      subtotal +
      taxAmount +
      (data.shipping_amount || 0) -
      (data.discount_amount || 0);

    const paidAmount = data.paid_amount || 0;
    const balanceAmount = totalAmount - paidAmount;

    const transaction = this.transactionRepo.create({
      tenant_id: tenantId,
      transaction_number: transactionNumber,
      type: data.type,
      status: TransactionStatus.DRAFT,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      transaction_date: new Date(data.transaction_date),
      due_date: data.due_date ? new Date(data.due_date) : undefined,
      subtotal,
      tax_amount: taxAmount,
      tax_rate: data.tax_rate || 0,
      discount_amount: data.discount_amount || 0,
      shipping_amount: data.shipping_amount || 0,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      balance_amount: balanceAmount,
      payment_method: data.payment_method,
      notes: data.notes,
      terms: data.terms,
      items: itemsData.map((item) => this.transactionItemRepo.create(item)),
    });

    return this.transactionRepo.save(
      transaction,
    ) as unknown as Promise<TransactionEntity>;
  }

  async update(
      id: string,
      data: CreateTransactionDto,
      tenantId: string,
    ): Promise<TransactionEntity> {
      const transaction = await this.findOne(id, tenantId);

      if (transaction.status !== TransactionStatus.DRAFT) {
        throw new Error('Only draft transactions can be updated');
      }

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;

      const itemsData = data.items.map((item) => {
        const itemTotal =
          item.quantity * item.unit_price - (item.discount_amount || 0);
        const itemTax = item.tax_amount || 0;

        subtotal += itemTotal;
        taxAmount += itemTax;

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount || 0,
          tax_amount: itemTax,
          total_amount: itemTotal + itemTax,
          notes: item.notes,
        };
      });

      const totalAmount =
        subtotal +
        taxAmount +
        (data.shipping_amount || 0) -
        (data.discount_amount || 0);

      const paidAmount = data.paid_amount || 0;
      const balanceAmount = totalAmount - paidAmount;

      // Delete old items
      await this.transactionItemRepo.delete({ transaction_id: id });

      // Update transaction
      transaction.type = data.type;
      transaction.customer_id = data.customer_id as any;
      transaction.customer_name = data.customer_name as any;
      transaction.supplier_id = data.supplier_id as any;
      transaction.supplier_name = data.supplier_name as any;
      transaction.transaction_date = new Date(data.transaction_date);
      transaction.due_date = data.due_date
        ? new Date(data.due_date)
        : (null as any);
      transaction.subtotal = subtotal;
      transaction.tax_amount = taxAmount;
      transaction.tax_rate = data.tax_rate || 0;
      transaction.discount_amount = data.discount_amount || 0;
      transaction.shipping_amount = data.shipping_amount || 0;
      transaction.total_amount = totalAmount;
      transaction.paid_amount = paidAmount;
      transaction.balance_amount = balanceAmount;
      transaction.payment_method = data.payment_method as any;
      transaction.notes = data.notes as any;
      transaction.terms = data.terms as any;
      transaction.items = itemsData.map((item) =>
        this.transactionItemRepo.create({ ...item, transaction_id: id }),
      );

      return this.transactionRepo.save(
        transaction,
      ) as unknown as Promise<TransactionEntity>;
    }

  async findAll(
    tenantId: string,
    filters?: {
      type?: TransactionType;
      status?: TransactionStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<TransactionEntity[]> {
    const where: any = { tenant_id: tenantId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate && filters?.endDate) {
      where.transaction_date = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    }

    return this.transactionRepo.find({
      where,
      relations: ['items'],
      order: { transaction_date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async complete(id: string, tenantId: string): Promise<TransactionEntity> {
    const transaction = await this.findOne(id, tenantId);

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Transaction already completed');
    }

    // Update inventory based on transaction type
    for (const item of transaction.items) {
      await this.updateInventory(
        tenantId,
        item.product_id,
        item.quantity,
        transaction.type,
      );
    }

    transaction.status = TransactionStatus.COMPLETED;
    return this.transactionRepo.save(transaction);
  }

  async cancel(id: string, tenantId: string): Promise<TransactionEntity> {
    const transaction = await this.findOne(id, tenantId);

    if (transaction.status === TransactionStatus.COMPLETED) {
      // Reverse inventory changes
      for (const item of transaction.items) {
        await this.updateInventory(
          tenantId,
          item.product_id,
          -item.quantity,
          transaction.type,
        );
      }
    }

    transaction.status = TransactionStatus.CANCELLED;
    return this.transactionRepo.save(transaction);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const transaction = await this.findOne(id, tenantId);

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot delete completed transaction. Cancel it first.',
      );
    }

    await this.transactionRepo.remove(transaction);
  }

  async getAnalytics(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const transactions = await this.findAll(tenantId, {
      startDate,
      endDate,
    });

    const analytics = {
      totalSales: 0,
      totalPurchases: 0,
      totalRevenue: 0,
      totalProfit: 0,
      transactionCount: transactions.length,
      salesCount: 0,
      purchaseCount: 0,
      averageOrderValue: 0,
      topProducts: [] as any[],
      dailySales: [] as any[],
      monthlySales: [] as any[],
      salesByStatus: {
        draft: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
      },
      salesByPaymentMethod: {} as any,
    };

    const productSales = new Map<string, any>();
    const dailySalesMap = new Map<string, number>();
    const monthlySalesMap = new Map<string, number>();

    transactions.forEach((transaction) => {
      // Count by status
      analytics.salesByStatus[transaction.status]++;

      if (transaction.status !== TransactionStatus.COMPLETED) {
        return;
      }

      // Sales and purchases
      if (transaction.type === TransactionType.SALE) {
        analytics.totalSales += Number(transaction.total_amount);
        analytics.salesCount++;

        // Payment method
        if (transaction.payment_method) {
          analytics.salesByPaymentMethod[transaction.payment_method] =
            (analytics.salesByPaymentMethod[transaction.payment_method] || 0) +
            Number(transaction.total_amount);
        }
      } else if (transaction.type === TransactionType.PURCHASE) {
        analytics.totalPurchases += Number(transaction.total_amount);
        analytics.purchaseCount++;
      }

      // Daily sales
      const dateKey = transaction.transaction_date.toISOString().split('T')[0];
      dailySalesMap.set(
        dateKey,
        (dailySalesMap.get(dateKey) || 0) + Number(transaction.total_amount),
      );

      // Monthly sales
      const monthKey = dateKey.substring(0, 7);
      monthlySalesMap.set(
        monthKey,
        (monthlySalesMap.get(monthKey) || 0) + Number(transaction.total_amount),
      );

      // Product sales
      transaction.items.forEach((item) => {
        const existing = productSales.get(item.product_id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total_amount);
        } else {
          productSales.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            revenue: Number(item.total_amount),
          });
        }
      });
    });

    analytics.totalRevenue = analytics.totalSales;
    analytics.totalProfit = analytics.totalSales - analytics.totalPurchases;
    analytics.averageOrderValue =
      analytics.salesCount > 0
        ? analytics.totalSales / analytics.salesCount
        : 0;

    // Top products
    analytics.topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily sales array
    analytics.dailySales = Array.from(dailySalesMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Monthly sales array
    analytics.monthlySales = Array.from(monthlySalesMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return analytics;
  }

  private async updateInventory(
    tenantId: string,
    productId: string,
    quantity: number,
    transactionType: TransactionType,
  ): Promise<void> {
    const inventory = await this.inventoryRepo.findOne({
      where: { product_id: productId, tenant_id: tenantId },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for product ${productId}`,
      );
    }

    // Adjust quantity based on transaction type
    let adjustment = 0;
    if (transactionType === TransactionType.SALE) {
      adjustment = -quantity; // Decrease stock
    } else if (transactionType === TransactionType.PURCHASE) {
      adjustment = quantity; // Increase stock
    } else if (transactionType === TransactionType.RETURN) {
      adjustment = quantity; // Increase stock
    } else if (transactionType === TransactionType.ADJUSTMENT) {
      adjustment = quantity; // Direct adjustment
    }

    inventory.quantity += adjustment;
    inventory.available_quantity =
      inventory.quantity - inventory.reserved_quantity;

    if (inventory.available_quantity < 0) {
      throw new BadRequestException(
        `Insufficient stock for ${inventory.product_name}`,
      );
    }

    await this.inventoryRepo.save(inventory);
  }

  private async generateTransactionNumber(
    tenantId: string,
    type: TransactionType,
  ): Promise<string> {
    const prefix = type.substring(0, 3).toUpperCase();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.transactionRepo.count({
      where: { tenant_id: tenantId, type },
    });

    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}-${year}${month}-${sequence}`;
  }
}
