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
  MovementStatus,
} from './entities/stock-movement.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { ShipmentEntity, ShipmentStatus, ShipmentPriority } from '../transportation/entities/shipment.entity';
import { ShipmentItemEntity } from '../transportation/entities/shipment-item.entity';
import { AccountPayableEntity, APStatus } from '../accounting/entities/account-payable.entity';
import { AccountReceivableEntity, ARStatus, ARApprovalStatus, ARPostingStatus, ARAcknowledgementStatus } from '../accounting/entities/account-receivable.entity';
import { AuditLogEntity, AuditSeverity } from '../compliance-audit/entities/audit-log.entity';
import { FinancialEventType, StockMovedEvent } from '../accounting/events/financial.events';
import { InventoryService } from '../inventory/inventory.service';

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
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentItemEntity)
    private shipmentItemRepo: Repository<ShipmentItemEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AuditLogEntity)
    private auditLogRepo: Repository<AuditLogEntity>,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
  ) { }

  // ==================== WAREHOUSE CRUD ====================

  async findAllWarehouses(tenantId: string) {
    const data = await this.warehouseRepo.find({
      where: { tenant_id: tenantId },
      order: { warehouse_name: 'ASC' },
    });
    return { data };
  }

  async findOneWarehouse(id: string, tenantId: string): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepo.findOne({ where: { id, tenant_id: tenantId } });
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

  async updateWarehouse(id: string, payload: Partial<WarehouseEntity>, tenantId: string) {
    const warehouse = await this.findOneWarehouse(id, tenantId);
    if (payload.warehouse_code && payload.warehouse_code !== warehouse.warehouse_code) {
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
    const binCount = await this.binRepo.count({ where: { warehouse_id: id, tenant_id: tenantId } });
    if (binCount > 0)
      throw new BadRequestException(
        `Cannot delete warehouse with ${binCount} bin(s). Remove bins first.`,
      );
    await this.warehouseRepo.remove(warehouse);
    return { message: 'Warehouse deleted successfully' };
  }

  // ==================== BIN CRUD ====================

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
    const bin = await this.binRepo.findOne({ where: { id, tenant_id: tenantId } });
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
      where: { warehouse_id: warehouseId, bin_code: binCode, tenant_id: tenantId },
    });
    if (existing)
      throw new ConflictException(`Bin code "${binCode}" already exists in this warehouse`);

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

  // ==================== STOCK MOVEMENT QUERIES ====================

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

  async findOneMovement(id: string, tenantId: string): Promise<StockMovementEntity> {
    const movement = await this.movementRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }

  // ==================== STEP 1: REQUEST A MOVEMENT ====================
  /**
   * Creates a stock movement in PENDING_APPROVAL status.
   * No inventory change happens here.
   *
   * For ISSUE: reduces available_quantity (reservation) so the stock
   * cannot be double-allocated, but physical quantity stays the same.
   *
   * Writes a compliance audit log entry for traceability.
   */
  async createMovement(payload: Partial<StockMovementEntity>, tenantId: string) {
    if (!payload.movement_type)
      throw new BadRequestException('movement_type is required');
    const qty = Number(payload.quantity);
    if (!qty || qty <= 0)
      throw new BadRequestException('quantity must be a positive number');
    if (!payload.movement_date)
      throw new BadRequestException('movement_date is required');

    // Resolve inventory item
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

    // VALIDATION: For ISSUE, we must reserve stock immediately
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

      // RESERVATION: Lock the stock so it cannot be double-allocated
      inventoryItem.reserved_quantity = Number(inventoryItem.reserved_quantity) + qty;
      inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
      await this.inventoryRepo.save(inventoryItem);
      this.logger.log(`[WAREHOUSE] Reserved ${qty} units for ${payload.movement_type} — available now: ${inventoryItem.available_quantity}`);
    }

    const unitCost = inventoryItem ? Number(inventoryItem.unit_cost) : Number(payload.unit_cost || 0);
    const totalCost = unitCost * qty;
    const movement_number = await this.generateMovementNumber(tenantId);
    const requisition_number = `REQ-${movement_number}`;

    const movement = this.movementRepo.create({
      ...payload,
      tenant_id: tenantId,
      movement_number,
      requisition_number,
      quantity: qty,
      unit_cost: unitCost,
      total_cost: totalCost,
      status: MovementStatus.PENDING_APPROVAL,
      journal_entry_created: false,
      product_name: payload.product_name || inventoryItem?.product_name,
    });
    const saved = await this.movementRepo.save(movement);

    // Write compliance audit log
    await this.writeAuditLog(
      'STOCK_MOVEMENT_REQUESTED',
      'stock_movement',
      saved.id,
      `Movement ${movement_number} (${payload.movement_type}, qty ${qty}) requested — awaiting approval.`,
      payload.requested_by,
      tenantId,
      AuditSeverity.LOW,
    );

    this.logger.log(`[WAREHOUSE] Movement ${movement_number} created — status: PENDING_APPROVAL`);
    return saved;
  }

  // ==================== STEP 2: APPROVE A MOVEMENT ====================
  /**
   * Executes the movement after manager approval:
   * 1. Changes physical inventory qty
   * 2. Creates Transaction record
   * 3. Emits STOCK_MOVED → Journal Entry (via FinancialBrainService)
   * 4. RECEIPT → creates AP bill
   * 5. ISSUE → creates AR invoice
   * 6. TRANSFER → creates Shipment (two-leg transit model)
   * 7. Compliance audit log
   */
  async approveMovement(id: string, approvedBy: string, tenantId: string) {
    const movement = await this.findOneMovement(id, tenantId);

    if (movement.status !== MovementStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Movement is not pending approval (current status: ${movement.status})`,
      );
    }

    // Resolve inventory item
    let inventoryItem: InventoryEntity | null = null;
    if (movement.product_id) {
      inventoryItem = await this.inventoryRepo.findOne({
        where: [
          { id: movement.product_id, tenant_id: tenantId },
          { product_id: movement.product_id, tenant_id: tenantId },
        ],
      });
    }

    const qty = movement.quantity;
    const oldQty = inventoryItem?.quantity ?? 0;

    // ── APPLY PHYSICAL INVENTORY CHANGE ─────────────────────────────────────
    if (inventoryItem) {
      switch (movement.movement_type) {
        case MovementType.RECEIPT:
          inventoryItem.quantity += qty;
          inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
          break;

        case MovementType.ISSUE:
          // Reserved qty was already locked at request time — now consume it
          inventoryItem.quantity -= qty;
          inventoryItem.reserved_quantity = Math.max(0, Number(inventoryItem.reserved_quantity) - qty);
          inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
          break;

        case MovementType.TRANSFER:
          // Source location: deduct physical qty (reservation already placed)
          inventoryItem.quantity -= qty;
          inventoryItem.reserved_quantity = Math.max(0, Number(inventoryItem.reserved_quantity) - qty);
          inventoryItem.available_quantity = inventoryItem.quantity - inventoryItem.reserved_quantity;
          break;

        case MovementType.ADJUSTMENT:
          // qty = new physical count
          inventoryItem.quantity = qty;
          inventoryItem.available_quantity = qty - inventoryItem.reserved_quantity;
          break;
      }

      await this.inventoryRepo.save(inventoryItem);

      // Auto-reorder check after ISSUE
      if (movement.movement_type === MovementType.ISSUE &&
        inventoryItem.available_quantity <= inventoryItem.reorder_level) {
        this.inventoryService.triggerAutoReorder(inventoryItem, tenantId).catch((e) =>
          this.logger.error(`[WAREHOUSE] Reorder trigger failed: ${e.message}`),
        );
      }
    }

    // ── COMPUTE COSTS ────────────────────────────────────────────────────────
    const unitCost = inventoryItem ? Number(inventoryItem.unit_cost) : Number(movement.unit_cost || 0);
    const jeQty = movement.movement_type === MovementType.ADJUSTMENT
      ? Math.abs(qty - oldQty)
      : qty;
    const totalCost = unitCost * jeQty;

    // ── UPDATE MOVEMENT STATUS ───────────────────────────────────────────────
    movement.status = MovementStatus.APPROVED;
    movement.approved_by = approvedBy;
    movement.approved_at = new Date();
    movement.unit_cost = unitCost;
    movement.total_cost = totalCost;

    // ── CREATE TRANSACTION RECORD (not for TRANSFER — internal move) ─────────
    if (movement.movement_type !== MovementType.TRANSFER) {
      const unitPrice = inventoryItem ? Number(inventoryItem.unit_price) : undefined;
      await this.createMovementTransaction(movement, tenantId, unitCost, totalCost, unitPrice);
    }

    // ── EMIT JE EVENT (STOCK_MOVED → FinancialBrainService creates JE) ───────
    const financialMovementType = this.toFinancialMovementType(movement.movement_type);
    if (financialMovementType && totalCost > 0) {
      const event = new StockMovedEvent();
      event.tenantId = tenantId;
      event.productId = inventoryItem?.id || movement.product_id || '';
      event.productName = movement.product_name || 'Unknown product';
      event.quantity = qty;
      event.movementType = financialMovementType;
      event.unitCost = unitCost;
      event.totalCost = totalCost;
      event.reference = movement.movement_number;
      this.eventEmitter.emit(FinancialEventType.STOCK_MOVED, event);
      movement.journal_entry_created = true;
    }

    // ── RECEIPT → Create AP Bill (you owe the supplier) ─────────────────────
    if (movement.movement_type === MovementType.RECEIPT) {
      const apId = await this.createApBill(movement, tenantId, totalCost);
      if (apId) movement.payable_id = apId;
    }

    // ── ISSUE → Create AR Invoice (customer owes you) ────────────────────────
    if (movement.movement_type === MovementType.ISSUE) {
      const arId = await this.createArInvoice(movement, tenantId, totalCost, inventoryItem);
      if (arId) movement.receivable_id = arId;
    }

    // ── TRANSFER → Create Shipment (two-leg: source → Transit → destination) ─
    if (movement.movement_type === MovementType.TRANSFER) {
      await this.createTransferShipment(movement, tenantId);
    }

    // Mark as fully executed
    movement.status = MovementStatus.EXECUTED;
    const saved = await this.movementRepo.save(movement);

    // ── COMPLIANCE AUDIT LOG ─────────────────────────────────────────────────
    await this.writeAuditLog(
      'STOCK_MOVEMENT_APPROVED',
      'stock_movement',
      saved.id,
      `Movement ${movement.movement_number} (${movement.movement_type}, qty ${qty}) approved and executed by ${approvedBy}. ` +
      `JE created: ${movement.journal_entry_created}. ` +
      `AP: ${movement.payable_id || 'none'}. AR: ${movement.receivable_id || 'none'}.`,
      approvedBy,
      tenantId,
      AuditSeverity.MEDIUM,
    );

    this.logger.log(`[WAREHOUSE] Movement ${movement.movement_number} EXECUTED successfully`);
    return saved;
  }

  // ==================== STEP 2b: REJECT A MOVEMENT ====================
  /**
   * Rejects a pending movement.
   * Releases the stock reservation (if any was placed).
   */
  async rejectMovement(
    id: string,
    rejectedBy: string,
    reason: string,
    tenantId: string,
  ) {
    const movement = await this.findOneMovement(id, tenantId);

    if (movement.status !== MovementStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Movement is not pending approval (current status: ${movement.status})`,
      );
    }

    // Release reserved stock (was locked at createMovement time)
    if (
      (movement.movement_type === MovementType.ISSUE ||
        movement.movement_type === MovementType.TRANSFER) &&
      movement.product_id
    ) {
      const inv = await this.inventoryRepo.findOne({
        where: [
          { id: movement.product_id, tenant_id: tenantId },
          { product_id: movement.product_id, tenant_id: tenantId },
        ],
      });
      if (inv) {
        inv.reserved_quantity = Math.max(0, Number(inv.reserved_quantity) - movement.quantity);
        inv.available_quantity = inv.quantity - inv.reserved_quantity;
        await this.inventoryRepo.save(inv);
        this.logger.log(`[WAREHOUSE] Released reservation of ${movement.quantity} units for rejected movement`);
      }
    }

    movement.status = MovementStatus.REJECTED;
    movement.approved_by = rejectedBy;
    movement.approved_at = new Date();
    movement.rejection_reason = reason || 'No reason provided';
    const saved = await this.movementRepo.save(movement);

    await this.writeAuditLog(
      'STOCK_MOVEMENT_REJECTED',
      'stock_movement',
      saved.id,
      `Movement ${movement.movement_number} rejected by ${rejectedBy}. Reason: ${movement.rejection_reason}`,
      rejectedBy,
      tenantId,
      AuditSeverity.MEDIUM,
    );

    this.logger.log(`[WAREHOUSE] Movement ${movement.movement_number} REJECTED`);
    return saved;
  }

  // ==================== UPDATE / DELETE (pre-execution only) ====================

  async updateMovement(id: string, payload: Partial<StockMovementEntity>, tenantId: string) {
    const movement = await this.findOneMovement(id, tenantId);

    if (movement.status === MovementStatus.EXECUTED) {
      throw new BadRequestException('Executed movements cannot be edited.');
    }

    const newQty = payload.quantity !== undefined ? Number(payload.quantity) : movement.quantity;
    if (newQty <= 0) throw new BadRequestException('quantity must be a positive number');

    // If ISSUE/TRANSFER and qty is changing, re-validate reservation
    if (
      (movement.movement_type === MovementType.ISSUE ||
        movement.movement_type === MovementType.TRANSFER) &&
      movement.product_id &&
      payload.quantity !== undefined &&
      payload.quantity !== movement.quantity
    ) {
      const inv = await this.inventoryRepo.findOne({
        where: [
          { id: movement.product_id, tenant_id: tenantId },
          { product_id: movement.product_id, tenant_id: tenantId },
        ],
      });
      if (inv) {
        // Release old reservation, apply new
        const delta = newQty - movement.quantity;
        const newReserved = Number(inv.reserved_quantity) + delta;
        const newAvailable = inv.quantity - newReserved;
        if (newAvailable < 0) {
          throw new BadRequestException(
            `Insufficient stock after reservation update: available ${inv.available_quantity + movement.quantity}, requested ${newQty}`,
          );
        }
        inv.reserved_quantity = newReserved;
        inv.available_quantity = newAvailable;
        await this.inventoryRepo.save(inv);
      }
    }

    payload.quantity = newQty;
    Object.assign(movement, payload);
    return this.movementRepo.save(movement);
  }

  async deleteMovement(id: string, tenantId: string) {
    const movement = await this.findOneMovement(id, tenantId);

    if (movement.status === MovementStatus.EXECUTED) {
      throw new BadRequestException('Executed movements cannot be deleted. Create a reversal adjustment instead.');
    }

    // Release reservation if pending
    if (
      movement.status === MovementStatus.PENDING_APPROVAL &&
      (movement.movement_type === MovementType.ISSUE ||
        movement.movement_type === MovementType.TRANSFER) &&
      movement.product_id
    ) {
      const inv = await this.inventoryRepo.findOne({
        where: [
          { id: movement.product_id, tenant_id: tenantId },
          { product_id: movement.product_id, tenant_id: tenantId },
        ],
      });
      if (inv) {
        inv.reserved_quantity = Math.max(0, Number(inv.reserved_quantity) - movement.quantity);
        inv.available_quantity = inv.quantity - inv.reserved_quantity;
        await this.inventoryRepo.save(inv);
      }
    }

    await this.movementRepo.remove(movement);
    return { message: 'Stock movement deleted successfully' };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Create an Accounts Payable (AP) bill for a RECEIPT movement.
   * Called after approval.
   */
  private async createApBill(
    movement: StockMovementEntity,
    tenantId: string,
    totalCost: number,
  ): Promise<string | null> {
    try {
      if (totalCost <= 0) return null;

      // Resolve vendor: try inventory supplier_id, fallback to a system vendor placeholder
      const inv = movement.product_id
        ? await this.inventoryRepo.findOne({
          where: [
            { id: movement.product_id, tenant_id: tenantId },
            { product_id: movement.product_id, tenant_id: tenantId },
          ],
        })
        : null;
      const vendorId = (inv as any)?.supplier_id || '00000000-0000-0000-0000-000000000000';

      const billDate = new Date();
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + 30); // Net-30

      const billNumber = `AP-${movement.movement_number}`;
      const ap = this.apRepo.create({
        tenant_id: tenantId,
        bill_number: billNumber,
        vendor_id: vendorId,
        bill_date: billDate,
        due_date: dueDate,
        total_amount: totalCost,
        paid_amount: 0,
        balance_amount: totalCost,
        status: APStatus.OPEN,
        reference: movement.movement_number,
        notes: `Auto-created from stock RECEIPT movement ${movement.movement_number}. Product: ${movement.product_name || '—'}, Qty: ${movement.quantity}`,
      });

      const saved = await this.apRepo.save(ap);
      this.logger.log(`[WAREHOUSE] AP bill ${billNumber} (${totalCost}) created for RECEIPT movement ${movement.movement_number}`);
      return saved.id;
    } catch (e: any) {
      this.logger.error(`[WAREHOUSE] Failed to create AP bill: ${e.message}`);
      return null;
    }
  }

  /**
   * Create an Accounts Receivable (AR) invoice for an ISSUE movement.
   * Called after approval.
   */
  private async createArInvoice(
    movement: StockMovementEntity,
    tenantId: string,
    totalCost: number,
    inventoryItem: InventoryEntity | null,
  ): Promise<string | null> {
    try {
      if (totalCost <= 0) return null;

      // Use selling price if available, fall back to cost
      const sellingPrice = inventoryItem
        ? Number(inventoryItem.unit_price) * movement.quantity
        : totalCost;
      const amount = sellingPrice > 0 ? sellingPrice : totalCost;

      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // Net-30

      const invoiceNumber = `AR-${movement.movement_number}`;

      const existing = await this.arRepo.findOne({ where: { invoice_number: invoiceNumber, tenant_id: tenantId } });
      if (existing) return existing.id;

      const ar = this.arRepo.create({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        customer_id: '00000000-0000-0000-0000-000000000000', // placeholder — update via AR module
        invoice_date: invoiceDate,
        due_date: dueDate,
        total_amount: amount,
        paid_amount: 0,
        balance_amount: amount,
        status: ARStatus.OPEN,
        approval_status: ARApprovalStatus.APPROVED,
        posting_status: ARPostingStatus.UNPOSTED,
        acknowledgement_status: ARAcknowledgementStatus.PENDING,
        reference: movement.movement_number,
        description: `Auto-created from stock ISSUE movement ${movement.movement_number}. Product: ${movement.product_name || '—'}, Qty: ${movement.quantity}`,
        notes: `Link to customer in AR module. Ref: ${movement.reference_document || movement.movement_number}`,
      });

      const saved = await this.arRepo.save(ar);
      this.logger.log(`[WAREHOUSE] AR invoice ${invoiceNumber} (${amount}) created for ISSUE movement ${movement.movement_number}`);
      return saved.id;
    } catch (e: any) {
      this.logger.error(`[WAREHOUSE] Failed to create AR invoice: ${e.message}`);
      return null;
    }
  }

  private async createMovementTransaction(
    movement: StockMovementEntity,
    tenantId: string,
    unitCost = 0,
    totalCost = 0,
    unitPrice?: number,
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

      const lineUnitPrice = movement.movement_type === MovementType.ISSUE && unitPrice
        ? unitPrice
        : unitCost;
      const lineTotal = lineUnitPrice * movement.quantity;

      const txNumber = await this.generateTransactionNumber(tenantId, txType);
      const movDate = movement.movement_date instanceof Date
        ? movement.movement_date
        : new Date(movement.movement_date);

      const item = this.transactionItemRepo.create({
        product_id: movement.product_id,
        product_name: movement.product_name || 'Stock movement',
        quantity: movement.quantity,
        unit_price: lineUnitPrice,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: lineTotal,
      });

      const tx = this.transactionRepo.create({
        tenant_id: tenantId,
        transaction_number: txNumber,
        type: txType,
        status: TransactionStatus.COMPLETED,
        transaction_date: movDate,
        subtotal: lineTotal,
        tax_amount: 0,
        tax_rate: 0,
        discount_amount: 0,
        shipping_amount: 0,
        total_amount: lineTotal,
        paid_amount: lineTotal,
        balance_amount: 0,
        notes: `Auto-generated from approved stock movement ${movement.movement_number}`,
        items: [item],
      });

      await this.transactionRepo.save(tx);
      this.logger.log(`[WAREHOUSE] Transaction ${txNumber} (${lineTotal}) created for movement ${movement.movement_number}`);
    } catch (e: any) {
      this.logger.error(`[WAREHOUSE] Failed to create transaction for movement: ${e.message}`);
    }
  }

  /**
   * Creates a two-leg shipment for TRANSFER:
   *   Source → Transit Location → Destination
   */
  private async createTransferShipment(movement: StockMovementEntity, tenantId: string): Promise<void> {
    try {
      const trackingNumber = await this.generateShipmentTrackingNumber(tenantId);
      const transitLocation = `TRANSIT-${movement.movement_number}`;

      const item = this.shipmentItemRepo.create({
        product_id: movement.product_id,
        product_name: movement.product_name || 'Transfer item',
        quantity: movement.quantity,
        description: `Stock transfer — movement ${movement.movement_number}. Leg 1: ${movement.from_location || 'Source'} → Transit. Leg 2: Transit → ${movement.to_location || 'Destination'}`,
      });

      const shipment = this.shipmentRepo.create({
        tenant_id: tenantId,
        tracking_number: trackingNumber,
        status: ShipmentStatus.PENDING,
        priority: ShipmentPriority.NORMAL,
        origin_name: movement.from_location || 'Warehouse',
        origin_address: movement.from_location || 'Internal',
        destination_name: movement.to_location || 'Destination',
        destination_address: movement.to_location || 'Internal',
        courier_id: movement.courier_id || undefined,
        notes: `Two-leg transfer: ${movement.from_location || 'Source'} → [${transitLocation}] → ${movement.to_location || 'Destination'}. Ref: ${movement.reference_document || movement.movement_number}`,
        shipping_cost: 0,
        insurance_cost: 0,
        total_cost: 0,
        tracking_history: [
          {
            status: ShipmentStatus.PENDING,
            timestamp: new Date(),
            location: movement.from_location || 'Source Warehouse',
            notes: `Transfer initiated: ${movement.movement_number}. In transit via ${transitLocation}.`,
          },
        ],
        items: [item],
      });

      const saved = await this.shipmentRepo.save(shipment) as unknown as { id: string };

      movement.shipment_id = saved.id;
      await this.movementRepo.save(movement);

      this.logger.log(`[TRANSFER] Shipment ${trackingNumber} created for movement ${movement.movement_number}`);
    } catch (e: any) {
      this.logger.error(`[TRANSFER] Failed to create shipment: ${e.message}`);
    }
  }

  private async writeAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    description: string,
    userId: string | undefined,
    tenantId: string,
    severity: AuditSeverity = AuditSeverity.LOW,
  ): Promise<void> {
    try {
      const log = this.auditLogRepo.create({
        tenant_id: tenantId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        description,
        user_id: userId || undefined,
        severity,
        new_values: { entity_type: entityType, entity_id: entityId },
      } as any);
      await this.auditLogRepo.save(log);
    } catch (e: any) {
      this.logger.error(`[WAREHOUSE] Failed to write audit log: ${e.message}`);
    }
  }

  private toFinancialMovementType(type: MovementType): 'IN' | 'OUT' | 'ADJUSTMENT' | null {
    switch (type) {
      case MovementType.RECEIPT: return 'IN';
      case MovementType.ISSUE: return 'OUT';
      case MovementType.ADJUSTMENT: return 'ADJUSTMENT';
      default: return null;
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

  private async generateShipmentTrackingNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await this.shipmentRepo.count({ where: { tenant_id: tenantId } });
    return `TRK-${year}${month}-${String(count + 1).padStart(6, '0')}`;
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
