import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { ProductEntity } from '../../modules/products/entities/product.entity';
import { InventoryEntity } from '../../modules/inventory/entities/inventory.entity';
import { SupplierEntity } from '../../modules/suppliers/supplier.entity';
import { CourierEntity } from '../../modules/transportation/entities/courier.entity';
import { ShipmentEntity, ShipmentStatus, ShipmentPriority } from '../../modules/transportation/entities/shipment.entity';
import { ShipmentItemEntity } from '../../modules/transportation/entities/shipment-item.entity';
import {
  PurchaseRequisitionEntity,
  RequisitionStatus,
  RequisitionPriority,
} from '../../modules/procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../../modules/procurement/entities/purchase-requisition-item.entity';
import {
  PurchaseOrderEntity,
  PurchaseOrderStatus,
} from '../../modules/procurement/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../modules/procurement/entities/purchase-order-item.entity';
import { ChartOfAccountEntity } from '../../modules/accounting/entities/chart-of-account.entity';
import {
  JournalEntryEntity,
  JournalEntryStatus,
  JournalEntryType,
} from '../../modules/accounting/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../../modules/accounting/entities/journal-entry-line.entity';
import {
  AccountPayableEntity,
  APStatus,
} from '../../modules/accounting/entities/account-payable.entity';

@Injectable()
export class WorkflowSeeder {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private productRepo: Repository<ProductEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(SupplierEntity)
    private supplierRepo: Repository<SupplierEntity>,
    @InjectRepository(CourierEntity)
    private courierRepo: Repository<CourierEntity>,
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ShipmentItemEntity)
    private shipmentItemRepo: Repository<ShipmentItemEntity>,
    @InjectRepository(PurchaseRequisitionEntity)
    private prRepo: Repository<PurchaseRequisitionEntity>,
    @InjectRepository(PurchaseRequisitionItemEntity)
    private prItemRepo: Repository<PurchaseRequisitionItemEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private poRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderItemEntity)
    private poItemRepo: Repository<PurchaseOrderItemEntity>,
    @InjectRepository(ChartOfAccountEntity)
    private coaRepo: Repository<ChartOfAccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private jeRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private jeLineRepo: Repository<JournalEntryLineEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
  ) {}

  async seed(tenantId: string): Promise<void> {
    console.log('\n🔄 Starting workflow seeding...');
    const categories = await this.seedCategories(tenantId);
    const products = await this.seedProducts(tenantId, categories);
    await this.seedInventory(tenantId, products);
    const { approvedReqs } = await this.seedRequisitions(tenantId, products);
    const pos = await this.seedPurchaseOrders(tenantId, approvedReqs, products);
    const shipments = await this.seedShipments(tenantId, pos, products);
    await this.seedAccountingEntries(tenantId, pos, shipments);
    console.log('✅ Workflow seeding completed!\n');
  }

  // ─── 1. Categories ────────────────────────────────────────────────────────

  private async seedCategories(tenantId: string): Promise<CategoryEntity[]> {
    console.log('📁 Seeding workflow categories...');
    const defs = [
      { name: 'Raw Materials',    color: '#f5222d', icon: '🧱', sort_order: 10 },
      { name: 'Packaging',        color: '#fa8c16', icon: '📦', sort_order: 11 },
      { name: 'MRO Supplies',     color: '#52c41a', icon: '🔧', sort_order: 12 },
      { name: 'Finished Goods',   color: '#1890ff', icon: '🏭', sort_order: 13 },
      { name: 'Spare Parts',      color: '#722ed1', icon: '⚙️',  sort_order: 14 },
    ];
    const result: CategoryEntity[] = [];
    for (const d of defs) {
      const slug = `wf_${tenantId.substring(0, 6)}_${d.name.toLowerCase().replace(/\s+/g, '_')}`;
      let cat = await this.categoryRepo.findOne({ where: { slug } });
      if (!cat) {
        cat = await this.categoryRepo.save({ ...d, slug, tenant_id: tenantId, is_active: true });
        console.log(`  ✓ Category: ${d.name}`);
      }
      result.push(cat);
    }
    return result;
  }

  // ─── 2. Products ──────────────────────────────────────────────────────────

  private async seedProducts(tenantId: string, categories: CategoryEntity[]): Promise<ProductEntity[]> {
    console.log('🛒 Seeding workflow products...');
    const tp = tenantId.substring(0, 6);
    const defs = [
      { name: 'Steel Rod 10mm',       sku: `WF-${tp}-RM001`, category: categories[0].name, cost_price: 45.00,  selling_price: 72.00  },
      { name: 'Aluminum Sheet 2mm',   sku: `WF-${tp}-RM002`, category: categories[0].name, cost_price: 120.00, selling_price: 185.00 },
      { name: 'Cardboard Box Large',  sku: `WF-${tp}-PK001`, category: categories[1].name, cost_price: 2.50,   selling_price: 5.00   },
      { name: 'Bubble Wrap Roll',     sku: `WF-${tp}-PK002`, category: categories[1].name, cost_price: 18.00,  selling_price: 30.00  },
      { name: 'Lubricant Oil 5L',     sku: `WF-${tp}-MR001`, category: categories[2].name, cost_price: 35.00,  selling_price: 55.00  },
      { name: 'Safety Gloves Pair',   sku: `WF-${tp}-MR002`, category: categories[2].name, cost_price: 8.00,   selling_price: 15.00  },
      { name: 'Assembled Unit A',     sku: `WF-${tp}-FG001`, category: categories[3].name, cost_price: 250.00, selling_price: 420.00 },
      { name: 'Assembled Unit B',     sku: `WF-${tp}-FG002`, category: categories[3].name, cost_price: 380.00, selling_price: 620.00 },
      { name: 'Bearing 6205',         sku: `WF-${tp}-SP001`, category: categories[4].name, cost_price: 12.00,  selling_price: 22.00  },
      { name: 'Seal Kit Type-3',      sku: `WF-${tp}-SP002`, category: categories[4].name, cost_price: 28.00,  selling_price: 48.00  },
    ];
    const result: ProductEntity[] = [];
    for (const d of defs) {
      let prod = await this.productRepo.findOne({ where: { sku: d.sku } });
      if (!prod) {
        prod = await this.productRepo.save({
          ...d,
          tenant_id: tenantId,
          quantity_in_stock: 0,
          reorder_level: 10,
          unit_of_measure: 'pcs',
          is_active: true,
        });
        console.log(`  ✓ Product: ${d.name}`);
      }
      result.push(prod);
    }
    return result;
  }

  // ─── 3. Inventory ─────────────────────────────────────────────────────────

  private async seedInventory(tenantId: string, products: ProductEntity[]): Promise<void> {
    console.log('📊 Seeding workflow inventory...');
    const tp = tenantId.substring(0, 6);
    const stocks = [200, 150, 500, 300, 80, 400, 60, 45, 250, 180];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const sku = `INV-${tp}-${String(i + 1).padStart(3, '0')}`;
      const existing = await this.inventoryRepo.findOne({ where: { sku, tenant_id: tenantId } });
      if (!existing) {
        const qty = stocks[i];
        await this.inventoryRepo.save({
          product_id: p.id,
          product_name: p.name,
          sku,
          quantity: qty,
          reserved_quantity: 0,
          available_quantity: qty,
          unit_cost: Number(p.cost_price),
          unit_price: Number(p.selling_price),
          reorder_level: 20,
          reorder_quantity: 50,
          max_stock_level: 600,
          location: `Z${i % 4 + 1}-0${(i % 3) + 1}`,
          warehouse: 'Main Warehouse',
          tenant_id: tenantId,
        });
        console.log(`  ✓ Inventory: ${p.name} (qty: ${qty})`);
      }
    }
  }

  // ─── 4. Requisitions ──────────────────────────────────────────────────────

  private async seedRequisitions(
    tenantId: string,
    products: ProductEntity[],
  ): Promise<{ openReqs: PurchaseRequisitionEntity[]; approvedReqs: PurchaseRequisitionEntity[] }> {    console.log('📋 Seeding purchase requisitions...');
    const tp = tenantId.substring(0, 8);
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000);

    // Open (pending_approval) requisitions — not yet approved
    const openDefs = [
      {
        requisition_number: `WF-PR-${tp}-O01`,
        department: 'Production',
        priority: RequisitionPriority.HIGH,
        purpose: 'Monthly raw material replenishment for production line A',
        items: [
          { product: products[0], qty: 100, price: 45.00 },
          { product: products[1], qty: 50,  price: 120.00 },
        ],
      },
      {
        requisition_number: `WF-PR-${tp}-O02`,
        department: 'Maintenance',
        priority: RequisitionPriority.MEDIUM,
        purpose: 'Quarterly MRO supplies restocking',
        items: [
          { product: products[4], qty: 20, price: 35.00 },
          { product: products[5], qty: 80, price: 8.00  },
          { product: products[8], qty: 30, price: 12.00 },
        ],
      },
      {
        requisition_number: `WF-PR-${tp}-O03`,
        department: 'Logistics',
        priority: RequisitionPriority.LOW,
        purpose: 'Packaging materials for Q2 shipments',
        items: [
          { product: products[2], qty: 200, price: 2.50 },
          { product: products[3], qty: 40,  price: 18.00 },
        ],
      },
    ];

    // Approved requisitions — will be converted to POs
    const approvedDefs = [
      {
        requisition_number: `WF-PR-${tp}-A01`,
        department: 'Production',
        priority: RequisitionPriority.URGENT,
        purpose: 'Emergency spare parts for machine overhaul',
        items: [
          { product: products[8], qty: 50, price: 12.00 },
          { product: products[9], qty: 25, price: 28.00 },
        ],
      },
      {
        requisition_number: `WF-PR-${tp}-A02`,
        department: 'Assembly',
        priority: RequisitionPriority.HIGH,
        purpose: 'Finished goods components for customer order batch',
        items: [
          { product: products[6], qty: 30, price: 250.00 },
          { product: products[7], qty: 20, price: 380.00 },
        ],
      },
    ];

    const openReqs: PurchaseRequisitionEntity[] = [];
    const approvedReqs: PurchaseRequisitionEntity[] = [];

    for (const def of openDefs) {
      let pr = await this.prRepo.findOne({ where: { requisition_number: def.requisition_number } });
      if (!pr) {
        pr = await this.prRepo.save({
          requisition_number: def.requisition_number,
          department: def.department,
          priority: def.priority,
          purpose: def.purpose,
          status: RequisitionStatus.PENDING_APPROVAL,
          requisition_date: daysAgo(5),
          required_by_date: daysAhead(14),
          requested_by: '00000000-0000-0000-0000-000000000001',
          tenant_id: tenantId,
        });
        for (const item of def.items) {
          await this.prItemRepo.save({
            requisition_id: pr.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.qty,
            estimated_price: item.price,
            total_estimated: item.qty * item.price,
            unit: 'pcs',
            tenant_id: tenantId,
          });
        }
        console.log(`  ✓ Open requisition: ${def.requisition_number}`);
      }
      openReqs.push(pr);    }

    for (const def of approvedDefs) {
      let pr = await this.prRepo.findOne({ where: { requisition_number: def.requisition_number } });
      if (!pr) {
        pr = await this.prRepo.save({
          requisition_number: def.requisition_number,
          department: def.department,
          priority: def.priority,
          purpose: def.purpose,
          status: RequisitionStatus.APPROVED,
          requisition_date: daysAgo(10),
          required_by_date: daysAhead(7),
          requested_by: '00000000-0000-0000-0000-000000000001',
          approved_by: '00000000-0000-0000-0000-000000000002',
          approved_at: daysAgo(7),
          tenant_id: tenantId,
        });
        for (const item of def.items) {
          await this.prItemRepo.save({
            requisition_id: pr.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.qty,
            estimated_price: item.price,
            total_estimated: item.qty * item.price,
            unit: 'pcs',
            tenant_id: tenantId,
          });
        }
        console.log(`  ✓ Approved requisition: ${def.requisition_number}`);
      }
      approvedReqs.push(pr);
    }

    return { openReqs, approvedReqs };
  }

  // ─── 5. Purchase Orders (from approved requisitions) ──────────────────────

  private async seedPurchaseOrders(
    tenantId: string,
    approvedReqs: PurchaseRequisitionEntity[],
    products: ProductEntity[],
  ): Promise<PurchaseOrderEntity[]> {
    console.log('🛍️  Seeding purchase orders...');
    const tp = tenantId.substring(0, 8);
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000);

    const suppliers = await this.supplierRepo.find({ where: { tenant_id: tenantId } });
    if (!suppliers.length) {
      console.log('  ⚠️  No suppliers found, skipping POs');
      return [];
    }

    const poDefs = [
      {
        po_number: `WF-PO-${tp}-001`,
        requisition: approvedReqs[0],
        supplier: suppliers[0],
        status: PurchaseOrderStatus.APPROVED,
        items: [
          { product: products[8], qty: 50,  unit_price: 12.00  },
          { product: products[9], qty: 25,  unit_price: 28.00  },
        ],
      },
      {
        po_number: `WF-PO-${tp}-002`,
        requisition: approvedReqs[1] ?? approvedReqs[0],
        supplier: suppliers[1] ?? suppliers[0],
        status: PurchaseOrderStatus.SENT,
        items: [
          { product: products[6], qty: 30,  unit_price: 250.00 },
          { product: products[7], qty: 20,  unit_price: 380.00 },
        ],
      },
      // An extra PO already received (goods in, ready for accounting)
      {
        po_number: `WF-PO-${tp}-003`,
        requisition: approvedReqs[0],
        supplier: suppliers[2] ?? suppliers[0],
        status: PurchaseOrderStatus.RECEIVED,
        items: [
          { product: products[0], qty: 100, unit_price: 45.00  },
          { product: products[1], qty: 50,  unit_price: 120.00 },
        ],
      },
    ];

    const result: PurchaseOrderEntity[] = [];
    for (const def of poDefs) {
      let po = await this.poRepo.findOne({ where: { po_number: def.po_number } });
      if (!po) {
        const subtotal = def.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
        const taxAmount = subtotal * 0.1;
        const saved = await this.poRepo.save(this.poRepo.create({
          po_number: def.po_number,
          vendor_id: def.supplier.id,
          requisition_id: def.requisition?.id ?? undefined,
          status: def.status,
          order_date: daysAgo(6),
          expected_delivery_date: daysAhead(5),
          subtotal,
          tax_amount: taxAmount,
          tax_rate: 10,
          total_amount: subtotal + taxAmount,
          payment_terms: 'Net 30',
          shipping_address: '100 Industrial Park, San Francisco, CA',
          billing_address: '100 Industrial Park, San Francisco, CA',
          created_by: '00000000-0000-0000-0000-000000000001',
          approved_by: def.status !== PurchaseOrderStatus.SENT ? '00000000-0000-0000-0000-000000000002' : undefined,
          approved_at: def.status !== PurchaseOrderStatus.SENT ? daysAgo(5) : undefined,
          tenant_id: tenantId,
        }));
        po = saved;
        for (const item of def.items) {
          await this.poItemRepo.save({
            purchase_order_id: po.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity_ordered: item.qty,
            quantity_received: def.status === PurchaseOrderStatus.RECEIVED ? item.qty : 0,
            unit_price: item.unit_price,
            total: item.qty * item.unit_price,
            unit: 'pcs',
            tenant_id: tenantId,
          });
        }
        console.log(`  ✓ PO: ${def.po_number} [${def.status}]`);
      }
      result.push(po!);
    }
    return result;
  }

  // ─── 6. Shipments ─────────────────────────────────────────────────────────

  private async seedShipments(
    tenantId: string,
    pos: PurchaseOrderEntity[],
    products: ProductEntity[],
  ): Promise<ShipmentEntity[]> {
    console.log('🚚 Seeding workflow shipments...');
    const tp = tenantId.substring(0, 8);
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000);

    const couriers = await this.courierRepo.find({ where: { tenant_id: tenantId } });
    if (!couriers.length) {
      console.log('  ⚠️  No couriers found, skipping shipments');
      return [];
    }

    // Shipments linked to the received PO and one in-transit
    const shipDefs = [
      {
        tracking_number: `WF-TRK-${tp}-001`,
        po: pos[2] ?? pos[0],   // received PO
        courier: couriers[0],
        status: ShipmentStatus.DELIVERED,
        priority: ShipmentPriority.NORMAL,
        origin_name: 'TechPro Distributors',
        origin_address: '123 Tech Ave, San Francisco, CA',
        destination_name: 'Main Warehouse',
        destination_address: '100 Industrial Park, San Francisco, CA',
        destination_city: 'San Francisco',
        weight: 85.0,
        shipping_cost: 120.00,
        items: [
          { product: products[0], qty: 100, unit_price: 45.00  },
          { product: products[1], qty: 50,  unit_price: 120.00 },
        ],
      },
      {
        tracking_number: `WF-TRK-${tp}-002`,
        po: pos[0],             // approved PO
        courier: couriers[1] ?? couriers[0],
        status: ShipmentStatus.IN_TRANSIT,
        priority: ShipmentPriority.HIGH,
        origin_name: 'Spare Parts Supplier',
        origin_address: '456 Industrial Blvd, Los Angeles, CA',
        destination_name: 'Main Warehouse',
        destination_address: '100 Industrial Park, San Francisco, CA',
        destination_city: 'San Francisco',
        weight: 22.0,
        shipping_cost: 65.00,
        items: [
          { product: products[8], qty: 50, unit_price: 12.00 },
          { product: products[9], qty: 25, unit_price: 28.00 },
        ],
      },
      {
        tracking_number: `WF-TRK-${tp}-003`,
        po: pos[1] ?? pos[0],   // sent PO
        courier: couriers[2] ?? couriers[0],
        status: ShipmentStatus.PENDING,
        priority: ShipmentPriority.NORMAL,
        origin_name: 'Assembly Supplier',
        origin_address: '789 Commerce St, Chicago, IL',
        destination_name: 'Assembly Plant',
        destination_address: '200 Factory Rd, San Francisco, CA',
        destination_city: 'San Francisco',
        weight: 140.0,
        shipping_cost: 210.00,
        items: [
          { product: products[6], qty: 30, unit_price: 250.00 },
          { product: products[7], qty: 20, unit_price: 380.00 },
        ],
      },
    ];

    const result: ShipmentEntity[] = [];
    for (const def of shipDefs) {
      let shipment = await this.shipmentRepo.findOne({ where: { tracking_number: def.tracking_number } });
      if (!shipment) {
        const saved = await this.shipmentRepo.save({
          tracking_number: def.tracking_number,
          transaction_id: def.po?.id ?? null,
          courier_id: def.courier.id,
          status: def.status,
          priority: def.priority,
          origin_name: def.origin_name,
          origin_address: def.origin_address,
          destination_name: def.destination_name,
          destination_address: def.destination_address,
          destination_city: def.destination_city,
          weight: def.weight,
          weight_unit: 'kg',
          package_count: def.items.length,
          shipping_cost: def.shipping_cost,
          total_cost: def.shipping_cost,
          pickup_date: daysAgo(3),
          estimated_delivery_date: daysAhead(2),
          actual_delivery_date: def.status === ShipmentStatus.DELIVERED ? daysAgo(1) : undefined,
          tracking_history: [
            { status: 'pending',   timestamp: daysAgo(3), location: def.origin_address,      note: 'Shipment created' },
            { status: def.status,  timestamp: new Date(), location: def.destination_city,    note: `Updated to ${def.status}` },
          ],
          tenant_id: tenantId,
        });
        shipment = saved;
        for (const item of def.items) {
          await this.shipmentItemRepo.save({
            shipment_id: shipment.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.qty,
            unit_price: item.unit_price,
            weight: def.weight / def.items.length,
          });
        }
        console.log(`  ✓ Shipment: ${def.tracking_number} [${def.status}]`);
      }
      result.push(shipment!);
    }
    return result;
  }

  // ─── 7. Accounting entries & AP bills ─────────────────────────────────────

  private async seedAccountingEntries(
    tenantId: string,
    pos: PurchaseOrderEntity[],
    shipments: ShipmentEntity[],
  ): Promise<void> {
    console.log('💰 Seeding workflow accounting entries...');
    const tp8 = tenantId.substring(0, 8);
    const p4 = tenantId.substring(0, 4);
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

    const accounts = await this.coaRepo.find({ where: { tenant_id: tenantId } });
    if (!accounts.length) {
      console.log('  ⚠️  No chart of accounts found, skipping accounting entries');
      return;
    }

    const getAcc = (suffix: string) =>
      accounts.find((a) => a.account_code === `${p4}-${suffix}`);

    const suppliers = await this.supplierRepo.find({ where: { tenant_id: tenantId } });

    // Helper: create a journal entry with two lines (debit / credit)
    const createJE = async (
      entryNumber: string,
      entryType: JournalEntryType,
      description: string,
      amount: number,
      debitSuffix: string,
      creditSuffix: string,
      date: Date,
    ): Promise<JournalEntryEntity | null> => {
      const existing = await this.jeRepo.findOne({ where: { entry_number: entryNumber } });
      if (existing) return existing;

      const debitAcc  = getAcc(debitSuffix);
      const creditAcc = getAcc(creditSuffix);
      if (!debitAcc || !creditAcc) {
        console.log(`  ⚠️  Accounts ${p4}-${debitSuffix} or ${p4}-${creditSuffix} not found, skipping ${entryNumber}`);
        return null;
      }

      const je = await this.jeRepo.save({
        entry_number: entryNumber,
        entry_date: date,
        entry_type: entryType,
        status: JournalEntryStatus.POSTED,
        description,
        total_debit: amount,
        total_credit: amount,
        posted_at: new Date(),
        tenant_id: tenantId,
      });

      await this.jeLineRepo.save([
        { journal_entry_id: je.id, account_id: debitAcc.id,  description, debit: amount, credit: 0,      line_number: 1, tenant_id: tenantId },
        { journal_entry_id: je.id, account_id: creditAcc.id, description, debit: 0,      credit: amount, line_number: 2, tenant_id: tenantId },
      ]);

      console.log(`  ✓ Journal entry: ${entryNumber} — ${description}`);
      return je;
    };

    // ── Received PO: Inventory receipt (Dr Inventory / Cr Accounts Payable)
    const receivedPo = pos.find((p) => p.status === PurchaseOrderStatus.RECEIVED);
    if (receivedPo) {
      await createJE(
        `WF-JE-${tp8}-001`,
        JournalEntryType.PURCHASE,
        `Inventory receipt — PO ${receivedPo.po_number}`,
        Number(receivedPo.subtotal),
        '1300', // Inventory
        '2000', // Accounts Payable
        daysAgo(4),
      );

      // Shipping cost entry (Dr Shipping Expense / Cr Accounts Payable)
      const deliveredShipment = shipments.find((s) => s.status === ShipmentStatus.DELIVERED);
      if (deliveredShipment) {
        await createJE(
          `WF-JE-${tp8}-002`,
          JournalEntryType.PURCHASE,
          `Freight cost — shipment ${deliveredShipment.tracking_number}`,
          Number(deliveredShipment.shipping_cost),
          '5700', // Shipping & Freight
          '2000', // Accounts Payable
          daysAgo(3),
        );
      }

      // AP bill for the received PO
      const billNumber = `WF-BILL-${tp8}-001`;
      const existingBill = await this.apRepo.findOne({ where: { bill_number: billNumber } });
      if (!existingBill && suppliers.length) {
        await this.apRepo.save({
          bill_number: billNumber,
          vendor_id: suppliers[0].id,
          purchase_order_id: receivedPo.id,
          bill_date: daysAgo(4),
          due_date: new Date(now.getTime() + 26 * 86400000), // Net 30
          total_amount: Number(receivedPo.total_amount),
          paid_amount: 0,
          balance_amount: Number(receivedPo.total_amount),
          status: APStatus.OPEN,
          reference: receivedPo.po_number,
          notes: `Auto-generated from PO ${receivedPo.po_number}`,
          tenant_id: tenantId,
        });
        console.log(`  ✓ AP bill: ${billNumber}`);
      }
    }

    // ── Approved PO: Purchase commitment (Dr Inventory / Cr Accounts Payable)
    const approvedPo = pos.find((p) => p.status === PurchaseOrderStatus.APPROVED);
    if (approvedPo) {
      await createJE(
        `WF-JE-${tp8}-003`,
        JournalEntryType.PURCHASE,
        `Purchase commitment — PO ${approvedPo.po_number}`,
        Number(approvedPo.subtotal),
        '1300', // Inventory
        '2000', // Accounts Payable
        daysAgo(2),
      );
    }

    // ── COGS entry for goods dispatched (Dr COGS / Cr Inventory)
    await createJE(
      `WF-JE-${tp8}-004`,
      JournalEntryType.GENERAL,
      'Cost of goods dispatched — workflow batch',
      8750.00,
      '5000', // COGS
      '1300', // Inventory
      daysAgo(1),
    );

    // ── Payment to supplier (Dr Accounts Payable / Cr Bank)
    await createJE(
      `WF-JE-${tp8}-005`,
      JournalEntryType.PAYMENT,
      'Supplier payment — partial settlement',
      5000.00,
      '2000', // Accounts Payable
      '1100', // Bank
      now,
    );
  }
}
