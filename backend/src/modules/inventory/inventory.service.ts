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
import { PurchaseRequisitionEntity, RequisitionStatus, RequisitionPriority } from '../procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../procurement/entities/purchase-requisition-item.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';

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
      // Check SKU uniqueness within tenant
      if (data.sku) {
        const existing = await this.inventoryRepo.findOne({
          where: { sku: data.sku, tenant_id: tenantId } as any,
        });
        if (existing) {
          throw new ConflictException('SKU already exists');
        }
      }

      const inventory = this.inventoryRepo.create({
        ...data,
        tenant_id: tenantId,
        available_quantity: data.quantity || 0,
      });

      const saved = await this.inventoryRepo.save(inventory);

      // If initial quantity > 0, emit STOCK_MOVED IN so accounting auto-creates JE
      if ((saved.quantity || 0) > 0) {
        const event = new StockMovedEvent();
        event.tenantId = tenantId;
        event.productId = saved.product_id || saved.id;
        event.productName = saved.product_name;
        event.quantity = saved.quantity;
        event.movementType = 'IN';
        event.unitCost = Number(saved.unit_cost);
        event.totalCost = saved.quantity * Number(saved.unit_cost);
        event.reference = `INIT-${saved.sku}`;
        this.eventEmitter.emit(FinancialEventType.STOCK_MOVED, event);
      }

      return saved;
    } catch (err: any) {
      this.logger.error(
        'Failed to create inventory item',
        err?.stack || err?.message,
        { data },
      );
      if (err instanceof ConflictException) throw err;
      throw new InternalServerErrorException('Failed to create inventory item');
    }
  }

  async update(
    id: string,
    data: Partial<InventoryEntity>,
    tenantId: string,
  ): Promise<InventoryEntity> {
    const inventory = await this.findOne(id, tenantId);

    Object.assign(inventory, data);

    if (data.quantity !== undefined || data.reserved_quantity !== undefined) {
      inventory.available_quantity =
        inventory.quantity - inventory.reserved_quantity;
    }

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

  async triggerAutoReorder(item: InventoryEntity, tenantId: string, customQty?: number): Promise<void> {
    try {
      // Avoid duplicate pending requisitions for the same product
      const existing = await this.requisitionRepo.findOne({
        where: {
          tenant_id: tenantId,
          status: RequisitionStatus.PENDING_APPROVAL,
        },
        relations: ['items'],
      });
      if (!customQty && existing?.items?.some((i) => i.product_id === item.id)) {
        this.logger.log(`[AUTO-REORDER] Skipped — pending requisition already exists for ${item.product_name}`);
        return;
      }

      const reorderQty = customQty || item.reorder_quantity || 50;
      const unitCost = Number(item.unit_cost);
      const totalCost = reorderQty * unitCost;
      const reqNumber = `REQ-${Date.now()}`;

      const requisition = this.requisitionRepo.create({
        tenant_id: tenantId,
        requisition_number: reqNumber,
        requisition_date: new Date() as any,
        department: 'Inventory',
        status: RequisitionStatus.PENDING_APPROVAL,
        priority: RequisitionPriority.HIGH,
        purpose: `Reorder: ${item.product_name} — current stock ${item.available_quantity}, reorder level ${item.reorder_level}`,
        notes: item.supplier_id
          ? `Preferred supplier: ${item.supplier_name || item.supplier_id}`
          : 'No preferred supplier set — assign manually',
      });

      const savedReq = await this.requisitionRepo.save(requisition);

      const reqItem = this.requisitionItemRepo.create({
        tenant_id: tenantId,
        requisition_id: savedReq.id,
        product_id: item.id,
        product_name: item.product_name,
        description: `SKU: ${item.sku}`,
        quantity: reorderQty,
        unit: 'pcs',
        estimated_price: unitCost,
        total_estimated: totalCost,
      });

      await this.requisitionItemRepo.save(reqItem);

      // Create a PURCHASE transaction (draft) so accountants can see the pending order
      const txCount = await this.transactionRepo.count({ where: { tenant_id: tenantId, type: TransactionType.PURCHASE } });
      const txNumber = `PUR-REORDER-${String(txCount + 1).padStart(5, '0')}`;

      const txItem = this.transactionItemRepo.create({
        product_id: item.id,
        product_name: item.product_name,
        sku: item.sku,
        quantity: reorderQty,
        unit_price: unitCost,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: totalCost,
        notes: `Reorder requisition ${reqNumber}`,
      });

      const tx = this.transactionRepo.create({
        tenant_id: tenantId,
        transaction_number: txNumber,
        type: TransactionType.PURCHASE,
        status: TransactionStatus.DRAFT,
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
        notes: `Auto-generated reorder for ${item.product_name} — requisition ${reqNumber}`,
        items: [txItem],
      });

      await this.transactionRepo.save(tx);

      // NOTE: Do NOT emit BILL_CREATED here.
      // When this draft transaction is completed via TransactionsService.complete(),
      // it emits BILL_CREATED + STOCK_MOVED IN -> FinancialBrainService creates the JE.
      // Emitting here would double-post the AP liability.

      this.logger.log(
        `[REORDER] Requisition ${reqNumber} + Transaction ${txNumber} created for ${item.product_name} x${reorderQty} ($${totalCost})`,
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
    const reorderQty = quantity || item.reorder_quantity || 50;
    await this.triggerAutoReorder(item, tenantId, reorderQty);
    return {
      message: `Reorder requisition created for ${item.product_name}`,
      product_name: item.product_name,
      reorder_quantity: reorderQty,
    };
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
