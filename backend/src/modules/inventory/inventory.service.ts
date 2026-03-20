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
    const totalCost = Math.abs(quantity) * Number(item.unit_cost);
    const event = new StockMovedEvent();
    event.tenantId = tenantId;
    event.productId = item.product_id || item.id;
    event.productName = item.product_name;
    event.quantity = Math.abs(quantity);
    event.movementType = movementType;
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

  private async triggerAutoReorder(item: InventoryEntity, tenantId: string): Promise<void> {
    try {
      // Avoid duplicate pending requisitions for the same product
      const existing = await this.requisitionRepo.findOne({
        where: {
          tenant_id: tenantId,
          status: RequisitionStatus.PENDING_APPROVAL,
        },
        relations: ['items'],
      });
      if (existing?.items?.some((i) => i.product_id === item.id)) {
        this.logger.log(`[AUTO-REORDER] Skipped — pending requisition already exists for ${item.product_name}`);
        return;
      }

      const reorderQty = item.reorder_quantity || 50;
      const reqNumber = `AUTO-REQ-${Date.now()}`;

      const requisition = this.requisitionRepo.create({
        tenant_id: tenantId,
        requisition_number: reqNumber,
        requisition_date: new Date() as any,
        requested_by: 'system' as any,
        department: 'Inventory',
        status: RequisitionStatus.PENDING_APPROVAL,
        priority: RequisitionPriority.HIGH,
        purpose: `Auto-reorder: ${item.product_name} stock (${item.available_quantity}) fell below reorder level (${item.reorder_level})`,
        notes: item.supplier_id
          ? `Preferred supplier ID: ${item.supplier_id}${item.supplier_name ? ' (' + item.supplier_name + ')' : ''}`
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
        estimated_price: Number(item.unit_cost),
        total_estimated: reorderQty * Number(item.unit_cost),
      });

      await this.requisitionItemRepo.save(reqItem);

      this.logger.log(
        `[AUTO-REORDER] Created requisition ${reqNumber} for ${item.product_name} x${reorderQty}`,
      );
    } catch (e) {
      this.logger.error(`[AUTO-REORDER] Failed to create requisition: ${e.message}`);
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

  async manualReorder(id: string, tenantId: string): Promise<any> {
    const item = await this.findOne(id, tenantId);
    await this.triggerAutoReorder(item, tenantId);
    return {
      message: `Reorder requisition created for ${item.product_name}`,
      product_name: item.product_name,
      reorder_quantity: item.reorder_quantity,
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
