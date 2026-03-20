import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WarehouseEntity } from './entities/warehouse.entity';
import { BinEntity } from './entities/bin.entity';
import {
  StockMovementEntity,
  MovementType,
} from './entities/stock-movement.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { FinancialEventType, StockMovedEvent } from '../accounting/events/financial.events';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    @InjectRepository(WarehouseEntity)
    private warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(BinEntity)
    private binRepo: Repository<BinEntity>,
    @InjectRepository(StockMovementEntity)
    private movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionItemEntity)
    private transactionItemRepo: Repository<TransactionItemEntity>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAllWarehouses(tenantId: string) {
    const data = await this.warehouseRepo.find({
      where: { tenant_id: tenantId },
      order: { warehouse_name: 'ASC' },
    });
    return { data };
  }

  async findOneWarehouse(
    id: string,
    tenantId: string,
  ): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async createWarehouse(payload: Partial<WarehouseEntity>, tenantId: string) {
    if (!payload.warehouse_code?.trim())
      throw new BadRequestException('warehouse_code is required');
    if (!payload.warehouse_name?.trim())
      throw new BadRequestException('warehouse_name is required');
    if (!payload.location?.trim())
      throw new BadRequestException('location is required');

    const code = payload.warehouse_code.trim().toUpperCase();
    const existing = await this.warehouseRepo.findOne({
      where: { warehouse_code: code, tenant_id: tenantId },
    });
    if (existing)
      throw new ConflictException(`Warehouse code "${code}" already exists`);

    const warehouse = this.warehouseRepo.create({
      ...payload,
      warehouse_code: code,
      warehouse_name: payload.warehouse_name.trim(),
      tenant_id: tenantId,
    });
    return this.warehouseRepo.save(warehouse);
  }

  async updateWarehouse(
    id: string,
    payload: Partial<WarehouseEntity>,
    tenantId: string,
  ) {
    const warehouse = await this.findOneWarehouse(id, tenantId);
    if (
      payload.warehouse_code &&
      payload.warehouse_code !== warehouse.warehouse_code
    ) {
      const code = payload.warehouse_code.trim().toUpperCase();
      const conflict = await this.warehouseRepo.findOne({
        where: { warehouse_code: code, tenant_id: tenantId },
      });
      if (conflict)
        throw new ConflictException(`Warehouse code "${code}" already exists`);
      payload.warehouse_code = code;
    }
    Object.assign(warehouse, payload);
    return this.warehouseRepo.save(warehouse);
  }

  async deleteWarehouse(id: string, tenantId: string) {
    const warehouse = await this.findOneWarehouse(id, tenantId);
    const binCount = await this.binRepo.count({
      where: { warehouse_id: id, tenant_id: tenantId },
    });
    if (binCount > 0)
      throw new BadRequestException(
        `Cannot delete warehouse with ${binCount} bin(s). Remove bins first.`,
      );
    await this.warehouseRepo.remove(warehouse);
    return { message: 'Warehouse deleted successfully' };
  }

  async findAllBins(tenantId: string, warehouseId?: string) {
    const where: Record<string, string> = { tenant_id: tenantId };
    if (warehouseId) where.warehouse_id = warehouseId;

    const data = await this.binRepo.find({
      where,
      relations: ['warehouse'],
      order: { bin_code: 'ASC' },
    });
    return {
      data: data.map((b) => ({
        id: b.id,
        tenant_id: b.tenant_id,
        warehouse_id: b.warehouse_id,
        warehouse_name: b.warehouse?.warehouse_name ?? '',
        bin_code: b.bin_code,
        zone: b.zone,
        aisle: b.aisle,
        rack: b.rack,
        level: b.level,
        capacity: b.capacity,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })),
    };
  }

  async findOneBin(id: string, tenantId: string): Promise<BinEntity> {
    const bin = await this.binRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!bin) throw new NotFoundException('Bin not found');
    return bin;
  }

  async createBin(payload: Partial<BinEntity>, tenantId: string) {
    const warehouseId = payload.warehouse_id;
    const binCode = payload.bin_code?.trim();
    if (!warehouseId) throw new BadRequestException('warehouse_id is required');
    if (!binCode) throw new BadRequestException('bin_code is required');

    await this.findOneWarehouse(warehouseId, tenantId);

    const existing = await this.binRepo.findOne({
      where: {
        warehouse_id: warehouseId,
        bin_code: binCode,
        tenant_id: tenantId,
      },
    });
    if (existing)
      throw new ConflictException(
        `Bin code "${binCode}" already exists in this warehouse`,
      );

    const bin = this.binRepo.create({
      ...payload,
      bin_code: binCode.toUpperCase(),
      tenant_id: tenantId,
    });
    return this.binRepo.save(bin);
  }

  async updateBin(id: string, payload: Partial<BinEntity>, tenantId: string) {
    const bin = await this.findOneBin(id, tenantId);
    Object.assign(bin, payload);
    return this.binRepo.save(bin);
  }

  async deleteBin(id: string, tenantId: string) {
    const bin = await this.findOneBin(id, tenantId);
    await this.binRepo.remove(bin);
    return { message: 'Bin deleted successfully' };
  }

  async findAllMovements(tenantId: string, movementType?: MovementType) {
    const where: Record<string, string> = { tenant_id: tenantId };
    if (movementType) where.movement_type = movementType;
    const data = await this.movementRepo.find({
      where,
      relations: ['inventory', 'inventory.supplier'],
      order: { movement_date: 'DESC', created_at: 'DESC' },
    });
    return { data };
  }

  async findMovementsByShipment(shipmentId: string, tenantId: string) {
    const data = await this.movementRepo.find({
      where: { shipment_id: shipmentId, tenant_id: tenantId },
      relations: ['inventory', 'inventory.supplier'],
      order: { movement_date: 'DESC' },
    });
    return { data };
  }

  async findOneMovement(
    id: string,
    tenantId: string,
  ): Promise<StockMovementEntity> {
    const movement = await this.movementRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }

  async createMovement(
    payload: Partial<StockMovementEntity>,
    tenantId: string,
  ) {
    if (!payload.movement_type)
      throw new BadRequestException('movement_type is required');
    const qty = Number(payload.quantity);
    if (!qty || qty <= 0)
      throw new BadRequestException('quantity must be a positive number');
    if (!payload.movement_date)
      throw new BadRequestException('movement_date is required');

    // Look up inventory item — try by inventory row id first, then by product_id
    let inventoryItem: InventoryEntity | null = null;
    if (payload.product_id) {
      inventoryItem = await this.inventoryRepo.findOne({
        where: { id: payload.product_id, tenant_id: tenantId },
      });
      if (!inventoryItem) {
        inventoryItem = await this.inventoryRepo.findOne({
          where: { product_id: payload.product_id, tenant_id: tenantId },
        });
      }
    }

    // Capture old qty before any changes (needed for ADJUSTMENT delta)
    const oldQty = inventoryItem ? inventoryItem.quantity : 0;

    if (payload.movement_type === MovementType.ISSUE || payload.movement_type === MovementType.TRANSFER) {
      if (!inventoryItem) {
        throw new BadRequestException(
          `Cannot ${payload.movement_type.toLowerCase()} stock: product not found in inventory.`,
        );
      }
      if (inventoryItem.available_quantity < qty) {
        throw new BadRequestException(
          `Insufficient stock: available ${inventoryItem.available_quantity}, requested ${qty}`,
        );
      }
      inventoryItem.quantity -= qty;
      inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
      await this.inventoryRepo.save(inventoryItem);
    } else if (payload.movement_type === MovementType.RECEIPT && inventoryItem) {
      inventoryItem.quantity += qty;
      inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
      await this.inventoryRepo.save(inventoryItem);
    } else if (payload.movement_type === MovementType.ADJUSTMENT && inventoryItem) {
      // ADJUSTMENT: qty = new physical count. Sets inventory to that exact value.
      inventoryItem.quantity = qty;
      inventoryItem.available_quantity = qty - inventoryItem.reserved_quantity;
      await this.inventoryRepo.save(inventoryItem);
    }

    const unitCost = inventoryItem ? Number(inventoryItem.unit_cost) : Number(payload.unit_cost || 0);
    // For ADJUSTMENT: JE amount = |delta| × unit_cost (only the change matters)
    // For RECEIPT/ISSUE: JE amount = qty × unit_cost
    const jeQty = payload.movement_type === MovementType.ADJUSTMENT
      ? Math.abs(qty - oldQty)
      : qty;
    const totalCost = unitCost * jeQty;

    const movement_number = await this.generateMovementNumber(tenantId);
    const movement = this.movementRepo.create({
      ...payload,
      tenant_id: tenantId,
      movement_number,
      quantity: qty,
      unit_cost: unitCost,
      total_cost: totalCost,
      journal_entry_created: false,
      product_name: payload.product_name || inventoryItem?.product_name,
    });
    const saved = await this.movementRepo.save(movement);

    // Create transaction + JE only for financially significant movements
    // TRANSFER is internal — no transaction, no JE
    if (saved.movement_type !== MovementType.TRANSFER) {
      await this.createMovementTransaction(saved, tenantId, unitCost, totalCost);
    }

    // Emit STOCK_MOVED — FinancialBrainService will create JE
    const financialMovementType = this.toFinancialMovementType(saved.movement_type);
    if (financialMovementType && totalCost > 0) {
      const event = new StockMovedEvent();
      event.tenantId = tenantId;
      event.productId = inventoryItem?.id || saved.product_id || '';
      event.productName = saved.product_name || 'Unknown product';
      event.quantity = qty;
      event.movementType = financialMovementType;
      event.unitCost = unitCost;
      event.totalCost = totalCost;
      event.reference = saved.movement_number;
      this.eventEmitter.emit(FinancialEventType.STOCK_MOVED, event);

      saved.journal_entry_created = true;
      await this.movementRepo.save(saved);
    }

    return saved;
  }

  private toFinancialMovementType(type: MovementType): 'IN' | 'OUT' | 'ADJUSTMENT' | null {
    switch (type) {
      case MovementType.RECEIPT: return 'IN';
      case MovementType.ISSUE: return 'OUT';
      case MovementType.ADJUSTMENT: return 'ADJUSTMENT';
      default: return null; // TRANSFER doesn't generate a financial event
    }
  }

  private async createMovementTransaction(
    movement: StockMovementEntity,
    tenantId: string,
    unitCost = 0,
    totalCost = 0,
  ): Promise<void> {
    try {
      const typeMap: Partial<Record<MovementType, TransactionType>> = {
        [MovementType.RECEIPT]: TransactionType.PURCHASE,
        [MovementType.ISSUE]: TransactionType.SALE,
        [MovementType.ADJUSTMENT]: TransactionType.ADJUSTMENT,
        [MovementType.TRANSFER]: TransactionType.TRANSFER,
      };
      const txType = typeMap[movement.movement_type];
      if (!txType) return;

      const txNumber = await this.generateTransactionNumber(tenantId, txType);
      const movDate = movement.movement_date instanceof Date
        ? movement.movement_date
        : new Date(movement.movement_date);

      const item = this.transactionItemRepo.create({
        product_id: movement.product_id,
        product_name: movement.product_name || 'Stock movement',
        quantity: movement.quantity,
        unit_price: unitCost,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: totalCost,
      });

      const tx = this.transactionRepo.create({
        tenant_id: tenantId,
        transaction_number: txNumber,
        type: txType,
        status: TransactionStatus.COMPLETED,
        transaction_date: movDate,
        subtotal: totalCost,
        tax_amount: 0,
        tax_rate: 0,
        discount_amount: 0,
        shipping_amount: 0,
        total_amount: totalCost,
        paid_amount: totalCost,
        balance_amount: 0,
        notes: `Auto-generated from stock movement ${movement.movement_number}`,
        items: [item],
      });

      await this.transactionRepo.save(tx);
      this.logger.log(`[WAREHOUSE] Transaction ${txNumber} (${totalCost}) created for movement ${movement.movement_number}`);
    } catch (e: any) {
      this.logger.error(`[WAREHOUSE] Failed to create transaction for movement: ${e.message}`);
    }
  }

  private async generateTransactionNumber(tenantId: string, type: TransactionType): Promise<string> {
    const prefix = type.substring(0, 3).toUpperCase();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await this.transactionRepo.count({ where: { tenant_id: tenantId, type } });
    return `${prefix}-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  async updateMovement(
    id: string,
    payload: Partial<StockMovementEntity>,
    tenantId: string,
  ) {
    const movement = await this.findOneMovement(id, tenantId);

    const newQty = payload.quantity !== undefined ? Number(payload.quantity) : movement.quantity;
    if (newQty <= 0) throw new BadRequestException('quantity must be a positive number');

    // Reverse the old inventory impact before applying new values
    if (movement.product_id) {
      const inv = await this.inventoryRepo.findOne({
        where: [
          { id: movement.product_id, tenant_id: tenantId },
          { product_id: movement.product_id, tenant_id: tenantId },
        ],
      });

      if (inv) {
        // Undo old movement
        if (movement.movement_type === MovementType.RECEIPT) {
          inv.quantity -= movement.quantity;
        } else if (movement.movement_type === MovementType.ISSUE || movement.movement_type === MovementType.TRANSFER) {
          inv.quantity += movement.quantity;
        }

        // Apply new movement type/qty
        const newType = (payload.movement_type || movement.movement_type) as MovementType;
        if (newType === MovementType.RECEIPT) {
          inv.quantity += newQty;
        } else if (newType === MovementType.ISSUE || newType === MovementType.TRANSFER) {
          if (inv.available_quantity + movement.quantity < newQty) {
            throw new BadRequestException(
              `Insufficient stock after reversal: available ${inv.available_quantity + movement.quantity}, requested ${newQty}`,
            );
          }
          inv.quantity -= newQty;
        }

        inv.available_quantity = inv.quantity - inv.reserved_quantity;
        await this.inventoryRepo.save(inv);

        // Recalculate costs
        const unitCost = Number(inv.unit_cost);
        payload.unit_cost = unitCost;
        payload.total_cost = unitCost * newQty;
      }
    }

    payload.quantity = newQty;
    payload.journal_entry_created = false; // reset — JE was already posted, new one won't fire for edits
    Object.assign(movement, payload);
    return this.movementRepo.save(movement);
  }

  async deleteMovement(id: string, tenantId: string) {
    const movement = await this.findOneMovement(id, tenantId);
    await this.movementRepo.remove(movement);
    return { message: 'Stock movement deleted successfully' };
  }

  private async generateMovementNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `MOV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const result = await this.movementRepo
      .createQueryBuilder('m')
      .select('MAX(m.movement_number)', 'max')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.movement_number LIKE :prefix', { prefix: `${prefix}-%` })
      .getRawOne<{ max: string | null }>();

    let seq = 1;
    if (result?.max) {
      const parts = result.max.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
