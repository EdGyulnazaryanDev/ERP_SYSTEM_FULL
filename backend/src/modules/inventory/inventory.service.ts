import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryEntity } from './entities/inventory.entity';
import { FinancialEventType, StockMovedEvent } from '../accounting/events/financial.events';
import { AccountingService } from '../accounting/accounting.service';
import { JournalEntryType } from '../accounting/entities/journal-entry.entity';
import { PurchaseRequisitionEntity, RequisitionStatus, RequisitionPriority } from '../procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../procurement/entities/purchase-requisition-item.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanLimitKey } from '../subscriptions/subscription.constants';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(PurchaseRequisitionEntity)
    private requisitionRepo: Repository<PurchaseRequisitionEntity>,
    @InjectRepository(PurchaseRequisitionItemEntity)
    private requisitionItemRepo: Repository<PurchaseRequisitionItemEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionItemEntity)
    private transactionItemRepo: Repository<TransactionItemEntity>,
    private eventEmitter: EventEmitter2,
    private accountingService: AccountingService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findAll(tenantId: string): Promise<InventoryEntity[]> {
    return this.inventoryRepo.find({
      where: { tenant_id: tenantId },
      relations: ['supplier'],
      order: { product_name: 'ASC' },
    });
  }

  async findLowStock(tenantId: string): Promise<InventoryEntity[]> {
    const items = await this.inventoryRepo.find({
      where: { tenant_id: tenantId },
    });

    return items.filter(
      (item) => item.available_quantity <= item.reorder_level,
    );
  }

  async findOne(id: string, tenantId: string): Promise<InventoryEntity> {
    const inventory = await this.inventoryRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['supplier'],
    });

    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    return inventory;
  }

  async create(
    data: Partial<InventoryEntity>,
    tenantId: string,
  ): Promise<InventoryEntity> {
    try {
      const openingQty = Math.max(Number(data.quantity || 0), 0);

      // Enforce plan limit — inventory items count against the products limit
      const currentCount = await this.inventoryRepo.count({ where: { tenant_id: tenantId } });
      await this.subscriptionsService.assertWithinLimit(tenantId, PlanLimitKey.PRODUCTS, currentCount);

      // Check SKU uniqueness within tenant
      if (data.sku) {
        const existing = await this.inventoryRepo.findOne({
          where: { sku: data.sku, tenant_id: tenantId } as any,
        });
        if (existing) {
          throw new ConflictException('SKU already exists');
        }
      }

      // Opening stock is set immediately — it represents physical stock already on hand
      // being registered in the system for the first time.
      // Reorder workflows are only triggered later when stock drops below reorder_level.
      const inventory = this.inventoryRepo.create({
        ...data,
        tenant_id: tenantId,
        quantity: openingQty,
        reserved_quantity: 0,
        available_quantity: openingQty,
      });

      const saved = await this.inventoryRepo.save(inventory);

      // Emit a stock-in financial event so accounting reflects the opening balance
      if (openingQty > 0) {
        const unitCost = Number(saved.unit_cost);
        const totalCost = openingQty * unitCost;
        if (totalCost > 0) {
          const event = new StockMovedEvent();
          event.tenantId = tenantId;
          event.productId = saved.id;
          event.productName = saved.product_name;
          event.quantity = openingQty;
          event.movementType = 'IN';
          event.unitCost = unitCost;
          event.totalCost = totalCost;
          event.reference = `OPENING-${saved.sku}`;
          event.source = 'opening';
          this.eventEmitter.emit(FinancialEventType.STOCK_MOVED, event);
        }
      }

      return saved;
    } catch (err: any) {
      this.logger.error(
        'Failed to create inventory item',
        err?.stack || err?.message,
        { data },
      );
      // Re-throw all HTTP exceptions as-is (ForbiddenException, ConflictException, etc.)
      if (err?.status) throw err;
      throw new InternalServerErrorException('Failed to create inventory item');
    }
  }

  async update(
    id: string,
    data: Partial<InventoryEntity>,
    tenantId: string,
  ): Promise<InventoryEntity> {
    const inventory = await this.findOne(id, tenantId);

    // Strip quantity fields — stock levels must only change via adjustStock() or inbound delivery.
    // Allowing direct quantity edits would bypass the procurement workflow and cause double-counting.
    const { quantity, reserved_quantity, available_quantity, ...safeData } = data as any;

    Object.assign(inventory, safeData);

    return this.inventoryRepo.save(inventory);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const inventory = await this.findOne(id, tenantId);
    await this.inventoryRepo.remove(inventory);
  }

  async adjustStock(
    id: string,
    quantity: number,
    movementType: 'IN' | 'OUT' | 'ADJUSTMENT',
    tenantId: string,
    reference?: string,
  ): Promise<InventoryEntity> {
    const item = await this.findOne(id, tenantId);
    const prevQty = item.quantity;

    if (movementType === 'IN') {
      item.quantity += quantity;
    } else if (movementType === 'OUT') {
      if (item.available_quantity < quantity) {
        throw new Error(`Insufficient stock: available ${item.available_quantity}, requested ${quantity}`);
      }
      item.quantity -= quantity;
    } else {
      item.quantity = quantity;
    }

    item.available_quantity = item.quantity - item.reserved_quantity;
    const saved = await this.inventoryRepo.save(item);

    // Emit financial event for accounting
    const adjustmentQty =
      movementType === 'ADJUSTMENT'
        ? Math.abs(item.quantity - prevQty)
        : Math.abs(quantity);
    const effectiveMovementType =
      movementType === 'ADJUSTMENT' && item.quantity < prevQty ? 'OUT' : movementType;
    const totalCost = adjustmentQty * Number(item.unit_cost);
    const event = new StockMovedEvent();
    event.tenantId = tenantId;
    event.productId = item.product_id || item.id;
    event.productName = item.product_name;
    event.quantity = adjustmentQty;
    event.movementType = effectiveMovementType;
    event.unitCost = Number(item.unit_cost);
    event.totalCost = totalCost;
    event.reference = reference;
    this.eventEmitter.emit(FinancialEventType.STOCK_MOVED, event);

    // Auto-reorder: if stock dropped below reorder_level, create a purchase requisition
    if (
      (movementType === 'OUT' || movementType === 'ADJUSTMENT') &&
      saved.available_quantity <= saved.reorder_level
    ) {
      await this.triggerAutoReorder(saved, tenantId);
    }

    return saved;
  }

  async triggerAutoReorder(item: InventoryEntity, tenantId: string, customQty?: number, allowDuplicates = false): Promise<void> {
    try {
      // Avoid duplicate pending requisitions for the same product
      if (!allowDuplicates) {
        const existing = await this.requisitionRepo.find({
          where: {
            tenant_id: tenantId,
            status: RequisitionStatus.PENDING_APPROVAL,
          },
          relations: ['items'],
        });
        if (existing.some((req) => req.items?.some((i) => i.product_id === item.id))) {
          this.logger.log(`[AUTO-REORDER] Skipped — pending requisition already exists for ${item.product_name}`);
          return;
        }
      }

      const reorderQty = customQty || item.reorder_quantity || 50;
      await this.createInboundProcurementWorkflow(
        item,
        tenantId,
        reorderQty,
        'reorder',
        `Reorder: ${item.product_name} — current stock ${item.available_quantity}, reorder level ${item.reorder_level}`,
        allowDuplicates,
      );
    } catch (e: any) {
      this.logger.error(`[REORDER] Failed: ${e.message}`);
    }
  }

  async getReorderAlerts(tenantId: string): Promise<any[]> {
    const items = await this.inventoryRepo.find({
      where: { tenant_id: tenantId },
      relations: ['supplier'],
    });

    return items
      .filter((item) => item.available_quantity <= item.reorder_level)
      .map((item) => ({
        id: item.id,
        product_name: item.product_name,
        sku: item.sku,
        available_quantity: item.available_quantity,
        reorder_level: item.reorder_level,
        reorder_quantity: item.reorder_quantity,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier?.name || item.supplier_name || null,
        unit_cost: item.unit_cost,
        estimated_reorder_cost: item.reorder_quantity * Number(item.unit_cost),
        status: item.available_quantity <= 0 ? 'out_of_stock' : 'low_stock',
      }));
  }

  async manualReorder(id: string, tenantId: string, quantity?: number): Promise<any> {
    const item = await this.findOne(id, tenantId);
    const reorderQty = Math.max(Number(quantity || item.reorder_quantity || 50), 1);
    await this.triggerAutoReorder(item, tenantId, reorderQty, true);
    return {
      message: `Reorder requisition created for ${item.product_name}`,
      product_name: item.product_name,
      reorder_quantity: reorderQty,
    };
  }

  private async createInboundProcurementWorkflow(
    item: InventoryEntity,
    tenantId: string,
    quantity: number,
    source: 'reorder' | 'new_item',
    purpose: string,
    allowDuplicates: boolean,
  ): Promise<void> {
    const unitCost = Number(item.unit_cost);
    const totalCost = quantity * unitCost;
    const reqNumber = `REQ-${Date.now()}`;

    const requisition = this.requisitionRepo.create({
      tenant_id: tenantId,
      requisition_number: reqNumber,
      requisition_date: new Date() as any,
      department: source === 'new_item' ? 'Inventory Setup' : 'Inventory',
      status: RequisitionStatus.PENDING_APPROVAL,
      priority: source === 'new_item' ? RequisitionPriority.MEDIUM : RequisitionPriority.HIGH,
      purpose,
      notes: item.supplier_id
        ? `Preferred supplier: ${item.supplier_name || item.supplier_id}`
        : 'No preferred supplier set — assign manually',
    });

    const savedReq = await this.requisitionRepo.save(requisition);

    await this.requisitionItemRepo.save(
      this.requisitionItemRepo.create({
        tenant_id: tenantId,
        requisition_id: savedReq.id,
        product_id: item.id,
        product_name: item.product_name,
        description: `SKU: ${item.sku}`,
        quantity,
        unit: 'pcs',
        estimated_price: unitCost,
        total_estimated: totalCost,
      }),
    );

    const txNumber = await this.generateWorkflowTransactionNumber(tenantId, source);
    const workflowKey = `workflow:requisition:${reqNumber}`;
    const tx = this.transactionRepo.create({
      tenant_id: tenantId,
      transaction_number: txNumber,
      type: TransactionType.PURCHASE,
      status: TransactionStatus.PENDING,
      supplier_id: item.supplier_id as any,
      supplier_name: item.supplier_name || undefined,
      transaction_date: new Date(),
      subtotal: totalCost,
      tax_amount: 0,
      tax_rate: 0,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: totalCost,
      paid_amount: 0,
      balance_amount: totalCost,
      notes: source === 'new_item'
        ? `Pending initial stocking for ${item.product_name} — awaiting approval, shipment, and delivery`
        : `Pending reorder for ${item.product_name} — awaiting approval, shipment, and delivery`,
      terms: workflowKey,
      items: [
        this.transactionItemRepo.create({
          product_id: item.id,
          product_name: item.product_name,
          sku: item.sku,
          quantity,
          unit_price: unitCost,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: totalCost,
          notes: `${source === 'new_item' ? 'Initial stock' : 'Reorder'} requisition ${reqNumber}`,
        }),
      ],
    });

    const savedTx = await this.transactionRepo.save(tx);
    await this.ensureDraftPurchaseJournalEntry(savedTx, tenantId);

    this.logger.log(
      `[WORKFLOW] ${source.toUpperCase()} requisition ${reqNumber} + pending transaction ${savedTx.transaction_number} created for ${item.product_name} x${quantity} ($${totalCost})${allowDuplicates ? ' [manual/custom]' : ''}`,
    );
  }

  private async ensureDraftPurchaseJournalEntry(
    transaction: TransactionEntity,
    tenantId: string,
  ): Promise<void> {
    const existing = await this.accountingService.findJournalEntriesByReference(
      transaction.transaction_number,
      tenantId,
    );
    if (existing.length > 0) return;

    const inventoryAccount = await this.accountingService['findDefaultAccount'](tenantId, 'inventory');
    const apAccount = await this.accountingService['findDefaultAccount'](tenantId, 'accounts_payable');

    if (!inventoryAccount || !apAccount) {
      this.logger.warn(`[WORKFLOW] Draft JE skipped for ${transaction.transaction_number} — missing inventory/AP accounts`);
      return;
    }

    await this.accountingService.createJournalEntry(
      {
        entry_date: new Date(transaction.transaction_date).toISOString().split('T')[0],
        entry_type: JournalEntryType.PURCHASE,
        reference: transaction.transaction_number,
        description: `Pending purchase receipt for ${transaction.transaction_number}`,
        lines: [
          {
            account_id: inventoryAccount.id,
            description: `Pending inventory receipt - ${transaction.transaction_number}`,
            debit: Number(transaction.total_amount),
            credit: 0,
          },
          {
            account_id: apAccount.id,
            description: `Pending AP recognition - ${transaction.transaction_number}`,
            debit: 0,
            credit: Number(transaction.total_amount),
          },
        ],
      },
      tenantId,
    );
  }

  private async generateWorkflowTransactionNumber(
    tenantId: string,
    source: 'reorder' | 'new_item',
  ): Promise<string> {
    const count = await this.transactionRepo.count({
      where: { tenant_id: tenantId, type: TransactionType.PURCHASE },
    });
    const prefix = source === 'new_item' ? 'PUR-NEW' : 'PUR-REORDER';
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  async getStockSummary(tenantId: string): Promise<any> {
    const items = await this.findAll(tenantId);

    const summary = {
      totalItems: items.length,
      totalQuantity: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      categories: {} as any,
    };

    items.forEach((item) => {
      summary.totalQuantity += item.quantity;
      summary.totalValue += item.quantity * Number(item.unit_cost);

      if (item.available_quantity <= 0) {
        summary.outOfStockItems++;
      } else if (item.available_quantity <= item.reorder_level) {
        summary.lowStockItems++;
      }
    });

    return summary;
  }
}
