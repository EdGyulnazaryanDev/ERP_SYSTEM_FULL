import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialEventType, PurchaseOrderReceivedEvent } from '../accounting/events/financial.events';
import { JournalEntryEntity, JournalEntryStatus } from '../accounting/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../accounting/entities/journal-entry-line.entity';
import { PurchaseRequisitionEntity, RequisitionStatus } from './entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from './entities/purchase-requisition-item.entity';
import { RfqEntity, RfqStatus } from './entities/rfq.entity';
import { RfqItemEntity } from './entities/rfq-item.entity';
import { VendorQuoteEntity, QuoteStatus } from './entities/vendor-quote.entity';
import { VendorQuoteItemEntity } from './entities/vendor-quote-item.entity';
import { PurchaseOrderEntity, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from './entities/purchase-order-item.entity';
import { GoodsReceiptEntity, GoodsReceiptStatus } from './entities/goods-receipt.entity';
import { GoodsReceiptItemEntity } from './entities/goods-receipt-item.entity';
import { ShipmentEntity, ShipmentStatus, ShipmentPriority } from '../transportation/entities/shipment.entity';
import { ShipmentItemEntity } from '../transportation/entities/shipment-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity, TransactionStatus, TransactionType } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import type { CreatePurchaseRequisitionDto, UpdatePurchaseRequisitionDto, ApproveRequisitionDto, RejectRequisitionDto } from './dto/create-purchase-requisition.dto';
import type { CreateRfqDto, UpdateRfqDto } from './dto/create-rfq.dto';
import type { CreateVendorQuoteDto, UpdateVendorQuoteDto } from './dto/create-vendor-quote.dto';
import type { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ApprovePurchaseOrderDto } from './dto/create-purchase-order.dto';
import type { CreateGoodsReceiptDto, UpdateGoodsReceiptDto, ApproveGoodsReceiptDto } from './dto/create-goods-receipt.dto';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    @InjectRepository(PurchaseRequisitionEntity)
    private requisitionRepo: Repository<PurchaseRequisitionEntity>,
    @InjectRepository(PurchaseRequisitionItemEntity)
    private requisitionItemRepo: Repository<PurchaseRequisitionItemEntity>,
    @InjectRepository(RfqEntity)
    private rfqRepo: Repository<RfqEntity>,
    @InjectRepository(RfqItemEntity)
    private rfqItemRepo: Repository<RfqItemEntity>,
    @InjectRepository(VendorQuoteEntity)
    private vendorQuoteRepo: Repository<VendorQuoteEntity>,
    @InjectRepository(VendorQuoteItemEntity)
    private vendorQuoteItemRepo: Repository<VendorQuoteItemEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private purchaseOrderRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderItemEntity)
    private purchaseOrderItemRepo: Repository<PurchaseOrderItemEntity>,
    @InjectRepository(GoodsReceiptEntity)
    private goodsReceiptRepo: Repository<GoodsReceiptEntity>,
    @InjectRepository(GoodsReceiptItemEntity)
    private goodsReceiptItemRepo: Repository<GoodsReceiptItemEntity>,
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentItemEntity)
    private shipmentItemRepo: Repository<ShipmentItemEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionItemEntity)
    private transactionItemRepo: Repository<TransactionItemEntity>,
    @InjectRepository(JournalEntryEntity)
    private journalEntryRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private journalLineRepo: Repository<JournalEntryLineEntity>,
    private eventEmitter: EventEmitter2,
  ) { }



  // ==================== PURCHASE REQUISITION METHODS ====================

  async findAllRequisitions(tenantId: string): Promise<PurchaseRequisitionEntity[]> {
    return this.requisitionRepo.find({
      where: { tenant_id: tenantId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Returns all requisitions and purchase orders pending approval.
   * Used by managers/CEO to see their approval queue.
   */
  async findPendingApprovals(tenantId: string): Promise<{
    requisitions: PurchaseRequisitionEntity[];
    purchaseOrders: PurchaseOrderEntity[];
  }> {
    const [requisitions, purchaseOrders] = await Promise.all([
      this.requisitionRepo.find({
        where: { tenant_id: tenantId, status: RequisitionStatus.PENDING_APPROVAL },
        relations: ['items'],
        order: { created_at: 'ASC' },
      }),
      this.purchaseOrderRepo.find({
        where: { tenant_id: tenantId, status: PurchaseOrderStatus.PENDING_APPROVAL },
        relations: ['items'],
        order: { created_at: 'ASC' },
      }),
    ]);
    return { requisitions, purchaseOrders };
  }

  async findOneRequisition(id: string, tenantId: string): Promise<PurchaseRequisitionEntity> {
    const requisition = await this.requisitionRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!requisition) {
      throw new NotFoundException('Purchase requisition not found');
    }

    return requisition;
  }

  async createRequisition(data: CreatePurchaseRequisitionDto, tenantId: string): Promise<PurchaseRequisitionEntity> {
    const existing = await this.requisitionRepo.findOne({
      where: { requisition_number: data.requisition_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Requisition with this number already exists');
    }

    const { items, ...requisitionData } = data;

    const requisition = this.requisitionRepo.create({
      ...requisitionData,
      tenant_id: tenantId,
    });

    const savedRequisition = await this.requisitionRepo.save(requisition);

    if (items && items.length > 0) {
      const requisitionItems = items.map((item) =>
        this.requisitionItemRepo.create({
          ...item,
          requisition_id: savedRequisition.id,
          tenant_id: tenantId,
        }),
      );

      await this.requisitionItemRepo.save(requisitionItems);
    }

    return this.findOneRequisition(savedRequisition.id, tenantId);
  }

  async updateRequisition(id: string, data: UpdatePurchaseRequisitionDto, tenantId: string): Promise<PurchaseRequisitionEntity> {
    const requisition = await this.findOneRequisition(id, tenantId);

    const { items, ...requisitionData } = data;

    if (items) {
      await this.requisitionItemRepo.delete({ requisition_id: id, tenant_id: tenantId });

      const requisitionItems = items.map((item) =>
        this.requisitionItemRepo.create({
          ...item,
          requisition_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.requisitionItemRepo.save(requisitionItems);
    }

    Object.assign(requisition, requisitionData);
    return this.requisitionRepo.save(requisition);
  }

  async deleteRequisition(id: string, tenantId: string): Promise<void> {
    const requisition = await this.findOneRequisition(id, tenantId);
    await this.requisitionRepo.remove(requisition);
  }

  async approveRequisition(id: string, data: ApproveRequisitionDto, tenantId: string): Promise<PurchaseRequisitionEntity> {
    const requisition = await this.findOneRequisition(id, tenantId);

    if (requisition.status !== RequisitionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Requisition is not pending approval');
    }

    requisition.status = RequisitionStatus.APPROVED;
    if (data.approved_by) requisition.approved_by = data.approved_by;
    requisition.approved_at = new Date();

    const saved = await this.requisitionRepo.save(requisition);
    const linkedTransaction = await this.findWorkflowTransactionForRequisition(requisition, tenantId);

    // ── Create inbound PENDING shipment (supplier → warehouse) ──────────────────
    try {
      const existingShipment = linkedTransaction
        ? await this.shipmentRepo.findOne({
            where: { tenant_id: tenantId, transaction_id: linkedTransaction.id },
            relations: ['items'],
          })
        : null;
      if (existingShipment) {
        this.logger.log(`[PROCUREMENT] Shipment already exists for requisition ${requisition.requisition_number}`);
        return saved;
      }

      const trackingNumber = `SHP-REQ-${requisition.requisition_number}-${Date.now()}`;

      // Look up supplier info from inventory items
      let supplierName = 'Supplier';
      let supplierAddress = 'Supplier — update when confirmed';
      const firstItem = requisition.items?.[0];
      if (firstItem?.product_id) {
        const inv = await this.inventoryRepo.findOne({
          where: { id: firstItem.product_id, tenant_id: tenantId },
          relations: ['supplier'],
        });
        if (inv?.supplier) {
          supplierName = inv.supplier.name || supplierName;
          supplierAddress = inv.supplier.address || inv.supplier.email || supplierAddress;
        } else if (inv?.supplier_name) {
          supplierName = inv.supplier_name;
        }
      }

      const shipmentItems = (requisition.items || []).map((item) =>
        this.shipmentItemRepo.create({
          product_id: item.product_id || undefined,
          product_name: item.product_name,
          sku: item.description?.includes('SKU:')
            ? item.description.replace('SKU:', '').trim()
            : undefined,
          quantity: item.quantity,
          description: `${item.product_name} — qty: ${item.quantity}${item.unit ? ' ' + item.unit : ''}${item.estimated_price ? ' @ ' + Number(item.estimated_price).toFixed(2) : ''}`,
        }),
      );

      const shipment = this.shipmentRepo.create({
        tenant_id: tenantId,
        tracking_number: trackingNumber,
        transaction_id: linkedTransaction?.id,
        status: ShipmentStatus.PENDING,
        priority: ShipmentPriority.HIGH,
        origin_name: supplierName,
        origin_address: supplierAddress,
        destination_name: 'Warehouse',
        destination_address: 'Main Warehouse',
        notes: `Inbound shipment for approved requisition ${requisition.requisition_number}. ${requisition.purpose || ''}`,
        tracking_history: [
          {
            status: ShipmentStatus.PENDING,
            timestamp: new Date(),
            location: supplierName,
            notes: `Requisition ${requisition.requisition_number} approved — awaiting supplier dispatch`,
          },
        ],
        items: shipmentItems,
      });

      await this.shipmentRepo.save(shipment);
      if (linkedTransaction && linkedTransaction.status !== TransactionStatus.PENDING) {
        linkedTransaction.status = TransactionStatus.PENDING;
        await this.transactionRepo.save(linkedTransaction);
      }
      this.logger.log(`[PROCUREMENT] Created inbound shipment ${trackingNumber} for requisition ${requisition.requisition_number} (supplier: ${supplierName})`);
    } catch (e: any) {
      this.logger.error(`[PROCUREMENT] Failed to create inbound shipment: ${e.message}`);
    }

    return saved;
  }

  async rejectRequisition(id: string, data: RejectRequisitionDto, tenantId: string): Promise<PurchaseRequisitionEntity> {
    const requisition = await this.findOneRequisition(id, tenantId);

    if (requisition.status !== RequisitionStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Requisition is not pending approval');
    }

    requisition.status = RequisitionStatus.REJECTED;
    requisition.rejection_reason = data.rejection_reason;
    const saved = await this.requisitionRepo.save(requisition);

    const linkedTransaction = await this.findWorkflowTransactionForRequisition(requisition, tenantId);
    if (linkedTransaction) {
      linkedTransaction.status = TransactionStatus.CANCELLED;
      linkedTransaction.notes = `${linkedTransaction.notes || ''} Requisition rejected: ${data.rejection_reason}`.trim();
      await this.transactionRepo.save(linkedTransaction);
      await this.deleteDraftJournalEntriesForReference(linkedTransaction.transaction_number, tenantId);

      const shipments = await this.shipmentRepo.find({
        where: { tenant_id: tenantId, transaction_id: linkedTransaction.id, status: In([ShipmentStatus.PENDING, ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY]) },
      });
      for (const shipment of shipments) {
        shipment.status = ShipmentStatus.CANCELLED;
        shipment.tracking_history = [
          ...(shipment.tracking_history || []),
          {
            status: ShipmentStatus.CANCELLED,
            timestamp: new Date(),
            location: shipment.origin_address || shipment.origin_name,
            notes: `Cancelled because requisition ${requisition.requisition_number} was rejected`,
          },
        ];
        await this.shipmentRepo.save(shipment);
      }
    }

    return saved;
  }

  private async findWorkflowTransactionForRequisition(
    requisition: PurchaseRequisitionEntity,
    tenantId: string,
  ): Promise<TransactionEntity | null> {
    return this.transactionRepo.findOne({
      where: {
        tenant_id: tenantId,
        type: TransactionType.PURCHASE,
        terms: `workflow:requisition:${requisition.requisition_number}`,
      },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  private async deleteDraftJournalEntriesForReference(
    reference: string,
    tenantId: string,
  ): Promise<void> {
    const draftEntries = await this.journalEntryRepo.find({
      where: { tenant_id: tenantId, reference, status: JournalEntryStatus.DRAFT },
      relations: ['lines'],
    });

    for (const entry of draftEntries) {
      if (entry.lines?.length) {
        await this.journalLineRepo.delete({ journal_entry_id: entry.id, tenant_id: tenantId });
      }
      await this.journalEntryRepo.delete({ id: entry.id, tenant_id: tenantId });
    }
  }

  // ==================== RFQ METHODS ====================

  async findAllRfqs(tenantId: string): Promise<RfqEntity[]> {
    return this.rfqRepo.find({
      where: { tenant_id: tenantId },
      relations: ['items', 'vendor_quotes'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneRfq(id: string, tenantId: string): Promise<RfqEntity> {
    const rfq = await this.rfqRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items', 'vendor_quotes'],
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    return rfq;
  }

  async createRfq(data: CreateRfqDto, tenantId: string): Promise<RfqEntity> {
    const existing = await this.rfqRepo.findOne({
      where: { rfq_number: data.rfq_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('RFQ with this number already exists');
    }

    const { items, ...rfqData } = data;

    const rfq = this.rfqRepo.create({
      ...rfqData,
      tenant_id: tenantId,
    });

    const savedRfq = await this.rfqRepo.save(rfq);

    if (items && items.length > 0) {
      const rfqItems = items.map((item) =>
        this.rfqItemRepo.create({
          ...item,
          rfq_id: savedRfq.id,
          tenant_id: tenantId,
        }),
      );

      await this.rfqItemRepo.save(rfqItems);
    }

    return this.findOneRfq(savedRfq.id, tenantId);
  }

  async updateRfq(id: string, data: UpdateRfqDto, tenantId: string): Promise<RfqEntity> {
    const rfq = await this.findOneRfq(id, tenantId);

    const { items, ...rfqData } = data;

    if (items) {
      await this.rfqItemRepo.delete({ rfq_id: id, tenant_id: tenantId });

      const rfqItems = items.map((item) =>
        this.rfqItemRepo.create({
          ...item,
          rfq_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.rfqItemRepo.save(rfqItems);
    }

    Object.assign(rfq, rfqData);
    return this.rfqRepo.save(rfq);
  }

  async deleteRfq(id: string, tenantId: string): Promise<void> {
    const rfq = await this.findOneRfq(id, tenantId);
    await this.rfqRepo.remove(rfq);
  }

  // ==================== VENDOR QUOTE METHODS ====================

  async findAllVendorQuotes(tenantId: string, rfqId?: string): Promise<VendorQuoteEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (rfqId) {
      where.rfq_id = rfqId;
    }

    return this.vendorQuoteRepo.find({
      where,
      relations: ['items', 'rfq'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneVendorQuote(id: string, tenantId: string): Promise<VendorQuoteEntity> {
    const quote = await this.vendorQuoteRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items', 'rfq'],
    });

    if (!quote) {
      throw new NotFoundException('Vendor quote not found');
    }

    return quote;
  }

  async createVendorQuote(data: CreateVendorQuoteDto, tenantId: string): Promise<VendorQuoteEntity> {
    const existing = await this.vendorQuoteRepo.findOne({
      where: { quote_number: data.quote_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Vendor quote with this number already exists');
    }

    const { items, ...quoteData } = data;

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      subtotal += Number(item.total);
      taxAmount += Number(item.tax_amount || 0);
    });

    const totalAmount = subtotal + taxAmount + Number(data.shipping_cost || 0);

    const quote = this.vendorQuoteRepo.create({
      ...quoteData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tenant_id: tenantId,
    });

    const savedQuote = await this.vendorQuoteRepo.save(quote);

    if (items && items.length > 0) {
      const quoteItems = items.map((item) =>
        this.vendorQuoteItemRepo.create({
          ...item,
          vendor_quote_id: savedQuote.id,
          tenant_id: tenantId,
        }),
      );

      await this.vendorQuoteItemRepo.save(quoteItems);
    }

    return this.findOneVendorQuote(savedQuote.id, tenantId);
  }

  async updateVendorQuote(id: string, data: UpdateVendorQuoteDto, tenantId: string): Promise<VendorQuoteEntity> {
    const quote = await this.findOneVendorQuote(id, tenantId);

    const { items, ...quoteData } = data;

    if (items) {
      await this.vendorQuoteItemRepo.delete({ vendor_quote_id: id, tenant_id: tenantId });

      let subtotal = 0;
      let taxAmount = 0;

      items.forEach((item) => {
        subtotal += Number(item.total);
        taxAmount += Number(item.tax_amount || 0);
      });

      const totalAmount = subtotal + taxAmount + Number(data.shipping_cost || quote.shipping_cost || 0);

      quoteData['subtotal'] = subtotal;
      quoteData['tax_amount'] = taxAmount;
      quoteData['total_amount'] = totalAmount;

      const quoteItems = items.map((item) =>
        this.vendorQuoteItemRepo.create({
          ...item,
          vendor_quote_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.vendorQuoteItemRepo.save(quoteItems);
    }

    Object.assign(quote, quoteData);
    return this.vendorQuoteRepo.save(quote);
  }

  async deleteVendorQuote(id: string, tenantId: string): Promise<void> {
    const quote = await this.findOneVendorQuote(id, tenantId);
    await this.vendorQuoteRepo.remove(quote);
  }

  // ==================== PURCHASE ORDER METHODS ====================

  async findAllPurchaseOrders(tenantId: string): Promise<PurchaseOrderEntity[]> {
    return this.purchaseOrderRepo.find({
      where: { tenant_id: tenantId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  async findOnePurchaseOrder(id: string, tenantId: string): Promise<PurchaseOrderEntity> {
    const po = await this.purchaseOrderRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async createPurchaseOrder(data: CreatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrderEntity> {
    const existing = await this.purchaseOrderRepo.findOne({
      where: { po_number: data.po_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Purchase order with this number already exists');
    }

    const { items, ...poData } = data;

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      subtotal += Number(item.total);
      taxAmount += Number(item.tax_amount || 0);
    });

    const totalAmount = subtotal + taxAmount + Number(data.shipping_cost || 0) - Number(data.discount_amount || 0);

    const po = this.purchaseOrderRepo.create({
      ...poData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tenant_id: tenantId,
    });

    const savedPo = await this.purchaseOrderRepo.save(po);

    if (items && items.length > 0) {
      const poItems = items.map((item) =>
        this.purchaseOrderItemRepo.create({
          ...item,
          purchase_order_id: savedPo.id,
          tenant_id: tenantId,
        }),
      );

      await this.purchaseOrderItemRepo.save(poItems);
    }

    return this.findOnePurchaseOrder(savedPo.id, tenantId);
  }

  async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrderEntity> {
    const po = await this.findOnePurchaseOrder(id, tenantId);

    const { items, ...poData } = data;

    if (items) {
      await this.purchaseOrderItemRepo.delete({ purchase_order_id: id, tenant_id: tenantId });

      let subtotal = 0;
      let taxAmount = 0;

      items.forEach((item) => {
        subtotal += Number(item.total);
        taxAmount += Number(item.tax_amount || 0);
      });

      const totalAmount = subtotal + taxAmount + Number(data.shipping_cost || po.shipping_cost || 0) - Number(data.discount_amount || po.discount_amount || 0);

      poData['subtotal'] = subtotal;
      poData['tax_amount'] = taxAmount;
      poData['total_amount'] = totalAmount;

      const poItems = items.map((item) =>
        this.purchaseOrderItemRepo.create({
          ...item,
          purchase_order_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.purchaseOrderItemRepo.save(poItems);
    }

    Object.assign(po, poData);
    return this.purchaseOrderRepo.save(po);
  }

  async deletePurchaseOrder(id: string, tenantId: string): Promise<void> {
    const po = await this.findOnePurchaseOrder(id, tenantId);
    await this.purchaseOrderRepo.remove(po);
  }

  async approvePurchaseOrder(id: string, data: ApprovePurchaseOrderDto, tenantId: string): Promise<PurchaseOrderEntity> {
    const po = await this.findOnePurchaseOrder(id, tenantId);

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Purchase order is not pending approval');
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approved_by = data.approved_by;
    po.approved_at = new Date();

    return this.purchaseOrderRepo.save(po);
  }

  // ==================== GOODS RECEIPT METHODS ====================

  async findAllGoodsReceipts(tenantId: string): Promise<GoodsReceiptEntity[]> {
    return this.goodsReceiptRepo.find({
      where: { tenant_id: tenantId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneGoodsReceipt(id: string, tenantId: string): Promise<GoodsReceiptEntity> {
    const grn = await this.goodsReceiptRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['items'],
    });

    if (!grn) {
      throw new NotFoundException('Goods receipt not found');
    }

    return grn;
  }

  async createGoodsReceipt(data: CreateGoodsReceiptDto, tenantId: string): Promise<GoodsReceiptEntity> {
    const existing = await this.goodsReceiptRepo.findOne({
      where: { grn_number: data.grn_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Goods receipt with this number already exists');
    }

    const { items, ...grnData } = data;

    const grn = this.goodsReceiptRepo.create({
      ...grnData,
      tenant_id: tenantId,
    });

    const savedGrn = await this.goodsReceiptRepo.save(grn);

    if (items && items.length > 0) {
      const grnItems = items.map((item) =>
        this.goodsReceiptItemRepo.create({
          ...item,
          goods_receipt_id: savedGrn.id,
          tenant_id: tenantId,
        }),
      );

      await this.goodsReceiptItemRepo.save(grnItems);

      // Update PO item quantities
      for (const item of items) {
        const poItem = await this.purchaseOrderItemRepo.findOne({
          where: { id: item.po_item_id, tenant_id: tenantId },
        });

        if (poItem) {
          poItem.quantity_received = Number(poItem.quantity_received) + Number(item.quantity_received);
          await this.purchaseOrderItemRepo.save(poItem);
        }
      }

      // Update PO status if all items received
      const po = await this.purchaseOrderRepo.findOne({
        where: { id: data.purchase_order_id, tenant_id: tenantId },
        relations: ['items'],
      });

      if (po) {
        const allReceived = po.items.every((item) => item.quantity_received >= item.quantity_ordered);
        const someReceived = po.items.some((item) => item.quantity_received > 0);

        if (allReceived) {
          po.status = PurchaseOrderStatus.RECEIVED;
        } else if (someReceived) {
          po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
        }

        await this.purchaseOrderRepo.save(po);

        // Emit financial event for PO received
        if (allReceived || someReceived) {
          const event = new PurchaseOrderReceivedEvent();
          event.tenantId = tenantId;
          event.poId = po.id;
          event.poNumber = po.po_number;
          event.supplierId = (po as any).vendor_id || (po as any).supplier_id || '';
          event.totalAmount = Number(po.total_amount || 0);
          event.date = new Date().toISOString().split('T')[0];
          event.items = (data.items || []).map(i => ({
            productId: (i as any).product_id || '',
            quantity: i.quantity_received,
            unitCost: Number((i as any).unit_price || 0),
          }));
          this.eventEmitter.emit(FinancialEventType.PURCHASE_ORDER_RECEIVED, event);
        }
      }
    }

    return this.findOneGoodsReceipt(savedGrn.id, tenantId);
  }

  async updateGoodsReceipt(id: string, data: UpdateGoodsReceiptDto, tenantId: string): Promise<GoodsReceiptEntity> {
    const grn = await this.findOneGoodsReceipt(id, tenantId);

    const { items, ...grnData } = data;

    if (items) {
      await this.goodsReceiptItemRepo.delete({ goods_receipt_id: id, tenant_id: tenantId });

      const grnItems = items.map((item) =>
        this.goodsReceiptItemRepo.create({
          ...item,
          goods_receipt_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.goodsReceiptItemRepo.save(grnItems);
    }

    Object.assign(grn, grnData);
    return this.goodsReceiptRepo.save(grn);
  }

  async deleteGoodsReceipt(id: string, tenantId: string): Promise<void> {
    const grn = await this.findOneGoodsReceipt(id, tenantId);
    await this.goodsReceiptRepo.remove(grn);
  }

  async approveGoodsReceipt(id: string, data: ApproveGoodsReceiptDto, tenantId: string): Promise<GoodsReceiptEntity> {
    const grn = await this.findOneGoodsReceipt(id, tenantId);

    if (grn.status !== GoodsReceiptStatus.QUALITY_CHECK) {
      throw new BadRequestException('Goods receipt is not in quality check status');
    }

    grn.status = GoodsReceiptStatus.APPROVED;
    grn.approved_by = data.approved_by;
    grn.approved_at = new Date();
    grn.quality_check_notes = data.quality_check_notes || '';

    return this.goodsReceiptRepo.save(grn);
  }
}
