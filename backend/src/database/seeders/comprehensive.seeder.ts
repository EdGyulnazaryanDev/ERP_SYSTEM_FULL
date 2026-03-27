import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { InventoryEntity } from '../../modules/inventory/entities/inventory.entity';
import { SettingsService } from '../../modules/settings/settings.service';
import { WarehouseEntity } from '../../modules/warehouse/entities/warehouse.entity';
import { BinEntity } from '../../modules/warehouse/entities/bin.entity';
import {
  StockMovementEntity,
  MovementType,
} from '../../modules/warehouse/entities/stock-movement.entity';
import { SupplierEntity } from '../../modules/suppliers/supplier.entity';
import {
  CourierEntity,
  CourierType,
  CourierStatus,
} from '../../modules/transportation/entities/courier.entity';
import {
  ShipmentEntity,
  ShipmentStatus,
  ShipmentPriority,
} from '../../modules/transportation/entities/shipment.entity';
import {
  ChartOfAccountEntity,
  AccountType,
  AccountSubType,
} from '../../modules/accounting/entities/chart-of-account.entity';
import {
  JournalEntryEntity,
  JournalEntryStatus,
  JournalEntryType,
} from '../../modules/accounting/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../../modules/accounting/entities/journal-entry-line.entity';
import {
  AccountReceivableEntity,
  ARStatus,
} from '../../modules/accounting/entities/account-receivable.entity';
import {
  AccountPayableEntity,
  APStatus,
} from '../../modules/accounting/entities/account-payable.entity';
import {
  BankAccountEntity,
  BankAccountType,
} from '../../modules/accounting/entities/bank-account.entity';
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
import {
  RfqEntity,
  RfqStatus,
} from '../../modules/procurement/entities/rfq.entity';
import { RfqItemEntity } from '../../modules/procurement/entities/rfq-item.entity';
import {
  EmployeeEntity,
  EmploymentStatus,
  EmploymentType,
} from '../../modules/hr/entities/employee.entity';
import {
  CustomerEntity,
  CustomerType,
  CustomerStatus,
} from '../../modules/crm/entities/customer.entity';
import { ContactEntity } from '../../modules/crm/entities/contact.entity';
import {
  LeadEntity,
  LeadSource,
  LeadStatus,
} from '../../modules/crm/entities/lead.entity';

@Injectable()
export class ComprehensiveSeeder {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    @InjectRepository(WarehouseEntity)
    private warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(BinEntity) private binRepo: Repository<BinEntity>,
    @InjectRepository(StockMovementEntity)
    private movementRepo: Repository<StockMovementEntity>,
    @InjectRepository(SupplierEntity)
    private supplierRepo: Repository<SupplierEntity>,
    @InjectRepository(CourierEntity)
    private courierRepo: Repository<CourierEntity>,
    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,
    @InjectRepository(ChartOfAccountEntity)
    private coaRepo: Repository<ChartOfAccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private jeRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private jeLineRepo: Repository<JournalEntryLineEntity>,
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
    @InjectRepository(BankAccountEntity)
    private bankRepo: Repository<BankAccountEntity>,
    @InjectRepository(PurchaseRequisitionEntity)
    private prRepo: Repository<PurchaseRequisitionEntity>,
    @InjectRepository(PurchaseRequisitionItemEntity)
    private prItemRepo: Repository<PurchaseRequisitionItemEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private poRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderItemEntity)
    private poItemRepo: Repository<PurchaseOrderItemEntity>,
    @InjectRepository(RfqEntity) private rfqRepo: Repository<RfqEntity>,
    @InjectRepository(RfqItemEntity)
    private rfqItemRepo: Repository<RfqItemEntity>,
    @InjectRepository(EmployeeEntity)
    private employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,
    @InjectRepository(ContactEntity)
    private contactRepo: Repository<ContactEntity>,
    @InjectRepository(LeadEntity) private leadRepo: Repository<LeadEntity>,
    private settingsService: SettingsService,
  ) {}

  async seed(tenantId: string): Promise<void> {
    console.log('🌱 Starting comprehensive seeding...');

    await this.seedRoles(tenantId);
    await this.seedPermissions(tenantId);
    await this.seedRolePermissions(tenantId);
    await this.seedCategories(tenantId);
    await this.seedSuppliers(tenantId);
    await this.seedProducts(tenantId);
    await this.seedWarehouses(tenantId);
    await this.seedChartOfAccounts(tenantId);
    await this.seedBankAccounts(tenantId);
    await this.seedCouriers(tenantId);
    await this.seedCustomers(tenantId);
    await this.seedLeads(tenantId);
    await this.seedEmployees(tenantId);
    await this.seedProcurement(tenantId);
    await this.seedAccountingEntries(tenantId);
    await this.seedShipments(tenantId);
    await this.seedPageAccess(tenantId);

    console.log('✅ Seeding completed successfully!');
  }

  private async seedRoles(tenantId: string): Promise<void> {
    console.log('📝 Seeding roles...');
    const roles = [
      {
        name: 'Super Admin',
        description: 'Full system access',
        is_system: true,
      },
      { name: 'Admin', description: 'Administrative access', is_system: false },
      {
        name: 'Manager',
        description: 'Management level access',
        is_system: false,
      },
      { name: 'Sales', description: 'Sales team access', is_system: false },
      { name: 'Accountant', description: 'Financial access', is_system: false },
      {
        name: 'Warehouse',
        description: 'Inventory management access',
        is_system: false,
      },
      { name: 'Viewer', description: 'Read-only access', is_system: false },
    ];
    for (const roleData of roles) {
      const existing = await this.roleRepo.findOne({
        where: { name: roleData.name, tenant_id: tenantId },
      });
      if (!existing) {
        await this.roleRepo.save({ ...roleData, tenant_id: tenantId });
        console.log(`  ✓ Created role: ${roleData.name}`);
      }
    }
  }

  private async seedPermissions(tenantId: string): Promise<void> {
    console.log('🔐 Seeding permissions...');
    const resources = [
      'dashboard',
      'products',
      'categories',
      'inventory',
      'transactions',
      'finance',
      'modules',
      'roles',
      'permissions',
      'settings',
      'warehouse',
      'procurement',
      'hr',
      'crm',
      'accounting',
      'transportation',
      'manufacturing',
      'assets',
      'reports',
    ];
    const actions = [
      'read',
      'create',
      'update',
      'delete',
      'export',
      'approve',
      'adjust',
    ];
    for (const resource of resources) {
      for (const action of actions) {
        const existing = await this.permissionRepo.findOne({
          where: { resource, action, tenant_id: tenantId },
        });
        if (!existing) {
          await this.permissionRepo.save({
            name: `${resource}:${action}`,
            resource,
            action,
            description: `${action} ${resource}`,
            tenant_id: tenantId,
          });
        }
      }
    }
    console.log(`  ✓ Permissions seeded`);
  }

  private async seedRolePermissions(tenantId: string): Promise<void> {
    console.log('🔗 Seeding role-permission mappings...');
    const allPermissions = await this.permissionRepo.find({
      where: { tenant_id: tenantId },
    });
    const roles = await this.roleRepo.find({ where: { tenant_id: tenantId } });

    for (const role of roles) {
      let perms = allPermissions;
      if (role.name === 'Manager') {
        perms = allPermissions.filter(
          (p) =>
            ['read', 'create', 'update', 'export', 'approve'].includes(
              p.action,
            ) && !['roles', 'permissions', 'settings'].includes(p.resource),
        );
      } else if (role.name === 'Sales') {
        perms = allPermissions.filter(
          (p) =>
            [
              'products',
              'transactions',
              'inventory',
              'crm',
              'dashboard',
            ].includes(p.resource) &&
            ['read', 'create', 'update'].includes(p.action),
        );
      } else if (role.name === 'Accountant') {
        perms = allPermissions.filter(
          (p) =>
            ['finance', 'transactions', 'accounting', 'dashboard'].includes(
              p.resource,
            ) && ['read', 'export', 'create', 'update'].includes(p.action),
        );
      } else if (role.name === 'Warehouse') {
        perms = allPermissions.filter(
          (p) =>
            ['inventory', 'warehouse', 'products', 'dashboard'].includes(
              p.resource,
            ) && ['read', 'update', 'adjust', 'create'].includes(p.action),
        );
      } else if (role.name === 'Viewer') {
        perms = allPermissions.filter((p) => p.action === 'read');
      } else if (role.name === 'Admin') {
        perms = allPermissions.filter(
          (p) => !['settings'].includes(p.resource) || p.action === 'read',
        );
      }

      for (const permission of perms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: { role_id: role.id, permission_id: permission.id },
        });
        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: role.id,
            permission_id: permission.id,
          });
        }
      }
    }
    console.log(`  ✓ Role permissions mapped`);
  }

  private async seedCategories(tenantId: string): Promise<void> {
    console.log('📁 Seeding categories...');
    const categories = [
      {
        name: 'Electronics',
        description: 'Electronic devices',
        color: '#1890ff',
        icon: '📱',
        sort_order: 1,
      },
      {
        name: 'Computers',
        description: 'Computers and peripherals',
        color: '#1890ff',
        icon: '💻',
        sort_order: 2,
      },
      {
        name: 'Office Supplies',
        description: 'Office equipment',
        color: '#52c41a',
        icon: '📎',
        sort_order: 3,
      },
      {
        name: 'Furniture',
        description: 'Office furniture',
        color: '#fa8c16',
        icon: '🪑',
        sort_order: 4,
      },
      {
        name: 'Software',
        description: 'Software licenses',
        color: '#722ed1',
        icon: '💿',
        sort_order: 5,
      },
    ];
    for (const catData of categories) {
      const slug = `${tenantId.substring(0, 8)}_${catData.name.toLowerCase().replace(/\s+/g, '_')}`;
      const existing = await this.categoryRepo.findOne({ where: { slug } });
      if (!existing) {
        await this.categoryRepo.save({
          ...catData,
          slug,
          tenant_id: tenantId,
          is_active: true,
        });
        console.log(`  ✓ Created category: ${catData.name}`);
      }
    }
  }

  private async seedSuppliers(tenantId: string): Promise<void> {
    console.log('🏭 Seeding suppliers...');
    const suppliers = [
      {
        name: 'TechPro Distributors',
        email: 'orders@techpro.com',
        phone: '+1-555-0101',
        address: '123 Tech Ave',
        city: 'San Francisco',
        country: 'USA',
      },
      {
        name: 'Global Electronics Ltd',
        email: 'supply@globalelec.com',
        phone: '+1-555-0102',
        address: '456 Industrial Blvd',
        city: 'Los Angeles',
        country: 'USA',
      },
      {
        name: 'Office World Inc',
        email: 'procurement@officeworld.com',
        phone: '+1-555-0103',
        address: '789 Commerce St',
        city: 'Chicago',
        country: 'USA',
      },
      {
        name: 'Furniture Plus Co',
        email: 'sales@furnitureplus.com',
        phone: '+1-555-0104',
        address: '321 Design Rd',
        city: 'New York',
        country: 'USA',
      },
      {
        name: 'Software Solutions LLC',
        email: 'licensing@softsol.com',
        phone: '+1-555-0105',
        address: '654 Digital Way',
        city: 'Seattle',
        country: 'USA',
      },
    ];
    for (const s of suppliers) {
      const existing = await this.supplierRepo.findOne({
        where: { name: s.name, tenant_id: tenantId },
      });
      if (!existing) {
        await this.supplierRepo.save({
          ...s,
          tenant_id: tenantId,
          is_active: true,
        });
        console.log(`  ✓ Created supplier: ${s.name}`);
      }
    }
  }

  private async seedProducts(tenantId: string): Promise<void> {
    console.log('📦 Seeding inventory products...');
    const products = [
      {
        product_name: 'Laptop Dell XPS 15',
        sku: 'LAP-DELL-XPS15',
        quantity: 25,
        unit_cost: 1200.0,
        unit_price: 1599.99,
        reorder_level: 5,
        max_stock_level: 50,
        location: 'A1-01',
        warehouse: 'Main Warehouse',
        reorder_quantity: 20,
      },
      {
        product_name: 'iPhone 14 Pro',
        sku: 'PHN-APPL-14PRO',
        quantity: 40,
        unit_cost: 900.0,
        unit_price: 1199.99,
        reorder_level: 10,
        max_stock_level: 100,
        location: 'A1-02',
        warehouse: 'Main Warehouse',
        reorder_quantity: 30,
      },
      {
        product_name: 'Samsung Galaxy S23',
        sku: 'PHN-SAMS-S23',
        quantity: 35,
        unit_cost: 700.0,
        unit_price: 999.99,
        reorder_level: 10,
        max_stock_level: 80,
        location: 'A1-03',
        warehouse: 'Main Warehouse',
        reorder_quantity: 25,
      },
      {
        product_name: 'Office Chair Ergonomic',
        sku: 'FUR-CHAIR-ERG',
        quantity: 50,
        unit_cost: 150.0,
        unit_price: 299.99,
        reorder_level: 10,
        max_stock_level: 100,
        location: 'B2-01',
        warehouse: 'Main Warehouse',
        reorder_quantity: 20,
      },
      {
        product_name: 'Standing Desk Electric',
        sku: 'FUR-DESK-ELEC',
        quantity: 20,
        unit_cost: 400.0,
        unit_price: 699.99,
        reorder_level: 5,
        max_stock_level: 40,
        location: 'B2-02',
        warehouse: 'Main Warehouse',
        reorder_quantity: 10,
      },
      {
        product_name: 'Wireless Mouse Logitech',
        sku: 'ACC-MOUS-LOG',
        quantity: 100,
        unit_cost: 15.0,
        unit_price: 29.99,
        reorder_level: 20,
        max_stock_level: 200,
        location: 'C3-01',
        warehouse: 'Main Warehouse',
        reorder_quantity: 50,
      },
      {
        product_name: 'Mechanical Keyboard RGB',
        sku: 'ACC-KEYB-RGB',
        quantity: 60,
        unit_cost: 50.0,
        unit_price: 99.99,
        reorder_level: 15,
        max_stock_level: 120,
        location: 'C3-02',
        warehouse: 'Main Warehouse',
        reorder_quantity: 30,
      },
      {
        product_name: 'Monitor 27" 4K',
        sku: 'MON-27-4K',
        quantity: 30,
        unit_cost: 300.0,
        unit_price: 499.99,
        reorder_level: 8,
        max_stock_level: 60,
        location: 'A2-01',
        warehouse: 'Main Warehouse',
        reorder_quantity: 15,
      },
      {
        product_name: 'Printer HP LaserJet',
        sku: 'PRT-HP-LASER',
        quantity: 15,
        unit_cost: 200.0,
        unit_price: 349.99,
        reorder_level: 5,
        max_stock_level: 30,
        location: 'D4-01',
        warehouse: 'Main Warehouse',
        reorder_quantity: 10,
      },
      {
        product_name: 'External SSD 1TB',
        sku: 'STO-SSD-1TB',
        quantity: 80,
        unit_cost: 80.0,
        unit_price: 149.99,
        reorder_level: 20,
        max_stock_level: 150,
        location: 'C3-03',
        warehouse: 'Main Warehouse',
        reorder_quantity: 40,
      },
      {
        product_name: 'USB-C Hub 7-in-1',
        sku: 'ACC-USBC-HUB7',
        quantity: 75,
        unit_cost: 25.0,
        unit_price: 49.99,
        reorder_level: 15,
        max_stock_level: 150,
        location: 'C3-04',
        warehouse: 'Main Warehouse',
        reorder_quantity: 30,
      },
      {
        product_name: 'Webcam HD 1080p',
        sku: 'ACC-WCAM-1080',
        quantity: 45,
        unit_cost: 40.0,
        unit_price: 79.99,
        reorder_level: 10,
        max_stock_level: 90,
        location: 'C3-05',
        warehouse: 'Main Warehouse',
        reorder_quantity: 20,
      },
    ];
    for (const prodData of products) {
      const existing = await this.inventoryRepo.findOne({
        where: { sku: prodData.sku, tenant_id: tenantId },
      });
      if (!existing) {
        await this.inventoryRepo.save({
          ...prodData,
          tenant_id: tenantId,
          reserved_quantity: 0,
          available_quantity: prodData.quantity,
        });
        console.log(`  ✓ Created product: ${prodData.product_name}`);
      }
    }
  }

  private async seedWarehouses(tenantId: string): Promise<void> {
    console.log('🏢 Seeding warehouses and bins...');
    const warehousesData = [
      {
        warehouse_code: 'WH-MAIN',
        warehouse_name: 'Main Warehouse',
        location: '100 Industrial Park, San Francisco, CA',
        manager_name: 'John Smith',
        capacity: 10000,
      },
      {
        warehouse_code: 'WH-EAST',
        warehouse_name: 'East Distribution Center',
        location: '200 Logistics Ave, New York, NY',
        manager_name: 'Sarah Johnson',
        capacity: 5000,
      },
      {
        warehouse_code: 'WH-WEST',
        warehouse_name: 'West Coast Hub',
        location: '300 Harbor Blvd, Los Angeles, CA',
        manager_name: 'Mike Chen',
        capacity: 7500,
      },
    ];

    for (const wData of warehousesData) {
      let warehouse = await this.warehouseRepo.findOne({
        where: { warehouse_code: wData.warehouse_code, tenant_id: tenantId },
      });
      if (!warehouse) {
        warehouse = await this.warehouseRepo.save({
          ...wData,
          tenant_id: tenantId,
          is_active: true,
        });
        console.log(`  ✓ Created warehouse: ${wData.warehouse_name}`);
      }

      // Seed bins for each warehouse
      const zones = ['A', 'B', 'C', 'D'];
      for (const zone of zones) {
        for (let rack = 1; rack <= 3; rack++) {
          const binCode = `${zone}${rack}-01`;
          const existing = await this.binRepo.findOne({
            where: {
              bin_code: binCode,
              warehouse_id: warehouse.id,
              tenant_id: tenantId,
            },
          });
          if (!existing) {
            await this.binRepo.save({
              bin_code: binCode,
              zone,
              aisle: `${zone}`,
              rack: `${rack}`,
              level: '1',
              capacity: 500,
              warehouse_id: warehouse.id,
              tenant_id: tenantId,
            });
          }
        }
      }
    }

    // Seed stock movements
    const inventory = await this.inventoryRepo.find({
      where: { tenant_id: tenantId },
    });
    const warehouse = await this.warehouseRepo.findOne({
      where: { warehouse_code: 'WH-MAIN', tenant_id: tenantId },
    });
    if (warehouse && inventory.length > 0) {
      const movementTypes = [
        MovementType.RECEIPT,
        MovementType.ISSUE,
        MovementType.TRANSFER,
        MovementType.ADJUSTMENT,
      ];
      for (let i = 0; i < 15; i++) {
        const inv = inventory[i % inventory.length];
        const mType = movementTypes[i % movementTypes.length];
        const qty = Math.floor(Math.random() * 10) + 1;
        const cost = Number(inv.unit_cost) || 100;
        const movNum = `MOV-${String(i + 1).padStart(5, '0')}`;
        const existing = await this.movementRepo.findOne({
          where: { movement_number: movNum, tenant_id: tenantId },
        });
        if (!existing) {
          await this.movementRepo.save({
            movement_number: movNum,
            product_id: inv.id,
            product_name: inv.product_name,
            movement_type: mType,
            from_location:
              mType === MovementType.RECEIPT
                ? 'Supplier'
                : warehouse.warehouse_name,
            to_location:
              mType === MovementType.ISSUE
                ? 'Customer'
                : warehouse.warehouse_name,
            quantity: qty,
            unit_cost: cost,
            total_cost: qty * cost,
            movement_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            reference_document: `REF-${String(i + 1).padStart(5, '0')}`,
            notes: `Seeded movement ${i + 1}`,
            journal_entry_created: false,
            tenant_id: tenantId,
          });
        }
      }
      console.log(`  ✓ Created stock movements`);
    }
  }

  private async seedChartOfAccounts(tenantId: string): Promise<void> {
    console.log('📊 Seeding chart of accounts...');
    const p = tenantId.substring(0, 4); // short prefix for account codes
    const accounts = [
      // Assets
      {
        account_code: `${p}-1000`,
        account_name: 'Cash and Cash Equivalents',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.CASH,
        level: 1,
      },
      {
        account_code: `${p}-1010`,
        account_name: 'Petty Cash',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.CASH,
        level: 2,
      },
      {
        account_code: `${p}-1100`,
        account_name: 'Bank Account - Main',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.BANK,
        level: 1,
      },
      {
        account_code: `${p}-1200`,
        account_name: 'Accounts Receivable',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.ACCOUNTS_RECEIVABLE,
        level: 1,
      },
      {
        account_code: `${p}-1300`,
        account_name: 'Inventory',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.INVENTORY,
        level: 1,
      },
      {
        account_code: `${p}-1400`,
        account_name: 'Prepaid Expenses',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.CURRENT_ASSET,
        level: 1,
      },
      {
        account_code: `${p}-1500`,
        account_name: 'Fixed Assets',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.FIXED_ASSET,
        level: 1,
      },
      {
        account_code: `${p}-1510`,
        account_name: 'Equipment',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.FIXED_ASSET,
        level: 2,
      },
      {
        account_code: `${p}-1520`,
        account_name: 'Furniture & Fixtures',
        account_type: AccountType.ASSET,
        account_sub_type: AccountSubType.FIXED_ASSET,
        level: 2,
      },
      // Liabilities
      {
        account_code: `${p}-2000`,
        account_name: 'Accounts Payable',
        account_type: AccountType.LIABILITY,
        account_sub_type: AccountSubType.ACCOUNTS_PAYABLE,
        level: 1,
      },
      {
        account_code: `${p}-2100`,
        account_name: 'Accrued Liabilities',
        account_type: AccountType.LIABILITY,
        account_sub_type: AccountSubType.CURRENT_LIABILITY,
        level: 1,
      },
      {
        account_code: `${p}-2200`,
        account_name: 'Short-term Loans',
        account_type: AccountType.LIABILITY,
        account_sub_type: AccountSubType.CURRENT_LIABILITY,
        level: 1,
      },
      {
        account_code: `${p}-2500`,
        account_name: 'Long-term Debt',
        account_type: AccountType.LIABILITY,
        account_sub_type: AccountSubType.LONG_TERM_LIABILITY,
        level: 1,
      },
      // Equity
      {
        account_code: `${p}-3000`,
        account_name: 'Owner Equity',
        account_type: AccountType.EQUITY,
        account_sub_type: AccountSubType.CAPITAL,
        level: 1,
      },
      {
        account_code: `${p}-3100`,
        account_name: 'Retained Earnings',
        account_type: AccountType.EQUITY,
        account_sub_type: AccountSubType.RETAINED_EARNINGS,
        level: 1,
      },
      // Revenue
      {
        account_code: `${p}-4000`,
        account_name: 'Sales Revenue',
        account_type: AccountType.REVENUE,
        account_sub_type: AccountSubType.SALES_REVENUE,
        level: 1,
      },
      {
        account_code: `${p}-4100`,
        account_name: 'Service Revenue',
        account_type: AccountType.REVENUE,
        account_sub_type: AccountSubType.SERVICE_REVENUE,
        level: 1,
      },
      {
        account_code: `${p}-4200`,
        account_name: 'Other Income',
        account_type: AccountType.REVENUE,
        account_sub_type: AccountSubType.OTHER_INCOME,
        level: 1,
      },
      // Expenses
      {
        account_code: `${p}-5000`,
        account_name: 'Cost of Goods Sold',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.COST_OF_GOODS_SOLD,
        level: 1,
      },
      {
        account_code: `${p}-5100`,
        account_name: 'Salaries & Wages',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5200`,
        account_name: 'Rent Expense',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5300`,
        account_name: 'Utilities Expense',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5400`,
        account_name: 'Marketing & Advertising',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5500`,
        account_name: 'Administrative Expenses',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.ADMINISTRATIVE_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5600`,
        account_name: 'Depreciation Expense',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
      {
        account_code: `${p}-5700`,
        account_name: 'Shipping & Freight',
        account_type: AccountType.EXPENSE,
        account_sub_type: AccountSubType.OPERATING_EXPENSE,
        level: 1,
      },
    ];

    for (const acc of accounts) {
      const existing = await this.coaRepo.findOne({
        where: { account_code: acc.account_code, tenant_id: tenantId },
      });
      if (!existing) {
        await this.coaRepo.save({
          ...acc,
          tenant_id: tenantId,
          currency: 'USD',
          opening_balance: 0,
          current_balance: 0,
          is_active: true,
          is_system_account: true,
        });
      }
    }
    console.log(`  ✓ Created ${accounts.length} chart of accounts`);
  }

  private async seedBankAccounts(tenantId: string): Promise<void> {
    console.log('🏦 Seeding bank accounts...');
    const tenantPrefix = tenantId.substring(0, 8);
    const banks = [
      {
        account_name: 'Main Operating Account',
        account_number: `CHK-${tenantPrefix}`,
        account_type: BankAccountType.CHECKING,
        bank_name: 'First National Bank',
        branch: 'Downtown',
        currency: 'USD',
        opening_balance: 250000,
        current_balance: 250000,
      },
      {
        account_name: 'Savings Reserve',
        account_number: `SAV-${tenantPrefix}`,
        account_type: BankAccountType.SAVINGS,
        bank_name: 'First National Bank',
        branch: 'Downtown',
        currency: 'USD',
        opening_balance: 100000,
        current_balance: 100000,
      },
      {
        account_name: 'Corporate Credit Card',
        account_number: `CC-${tenantPrefix}`,
        account_type: BankAccountType.CREDIT_CARD,
        bank_name: 'Chase Bank',
        branch: 'Main',
        currency: 'USD',
        opening_balance: 0,
        current_balance: -5000,
      },
      {
        account_name: 'Petty Cash Fund',
        account_number: `CASH-${tenantPrefix}`,
        account_type: BankAccountType.CASH,
        bank_name: 'Internal',
        branch: 'Office',
        currency: 'USD',
        opening_balance: 2000,
        current_balance: 1500,
      },
    ];
    for (const b of banks) {
      const existing = await this.bankRepo.findOne({
        where: { account_number: b.account_number },
      });
      if (!existing) {
        await this.bankRepo.save({
          ...b,
          tenant_id: tenantId,
          is_active: true,
        });
        console.log(`  ✓ Created bank account: ${b.account_name}`);
      }
    }
  }

  private async seedCouriers(tenantId: string): Promise<void> {
    console.log('🚚 Seeding couriers...');
    const tenantPrefix = tenantId.substring(0, 8);
    const couriers = [
      {
        name: 'FastShip Express',
        code: `FSE-${tenantPrefix}`,
        type: CourierType.EXTERNAL,
        status: CourierStatus.ACTIVE,
        company_name: 'FastShip Inc',
        phone: '+1-555-2001',
        email: 'dispatch@fastship.com',
        vehicle_type: 'Van',
        base_rate: 15.0,
        per_km_rate: 0.5,
        rating: 4.8,
      },
      {
        name: 'QuickDeliver Pro',
        code: `QDP-${tenantPrefix}`,
        type: CourierType.EXTERNAL,
        status: CourierStatus.ACTIVE,
        company_name: 'QuickDeliver LLC',
        phone: '+1-555-2002',
        email: 'ops@quickdeliver.com',
        vehicle_type: 'Truck',
        base_rate: 25.0,
        per_km_rate: 0.75,
        rating: 4.5,
      },
      {
        name: 'Local Runner',
        code: `LR-${tenantPrefix}`,
        type: CourierType.INTERNAL,
        status: CourierStatus.ACTIVE,
        company_name: 'Internal Logistics',
        phone: '+1-555-2003',
        email: 'internal@company.com',
        vehicle_type: 'Motorcycle',
        base_rate: 8.0,
        per_km_rate: 0.3,
        rating: 4.2,
      },
      {
        name: 'Global Freight Co',
        code: `GFC-${tenantPrefix}`,
        type: CourierType.EXTERNAL,
        status: CourierStatus.ACTIVE,
        company_name: 'Global Freight Corp',
        phone: '+1-555-2004',
        email: 'freight@globalfreight.com',
        vehicle_type: 'Semi-Truck',
        base_rate: 100.0,
        per_km_rate: 1.2,
        rating: 4.6,
      },
    ];
    for (const c of couriers) {
      const existing = await this.courierRepo.findOne({
        where: { code: c.code },
      });
      if (!existing) {
        await this.courierRepo.save({
          ...c,
          tenant_id: tenantId,
          total_deliveries: Math.floor(Math.random() * 500) + 50,
        });
        console.log(`  ✓ Created courier: ${c.name}`);
      }
    }
  }

  private async seedCustomers(tenantId: string): Promise<void> {
    console.log('👥 Seeding CRM customers and contacts...');
    const tp = tenantId.substring(0, 8);
    const customers = [
      {
        customer_code: `CUST-${tp}-001`,
        company_name: 'Acme Corporation',
        contact_person: 'Alice Walker',
        email: `alice.${tp}@acme.com`,
        phone: '+1-555-3001',
        city: 'New York',
        country: 'USA',
        customer_type: CustomerType.BUSINESS,
        industry: 'Technology',
        credit_limit: 50000,
        payment_terms: 30,
      },
      {
        customer_code: `CUST-${tp}-002`,
        company_name: 'TechStart Inc',
        contact_person: 'Bob Martinez',
        email: `bob.${tp}@techstart.com`,
        phone: '+1-555-3002',
        city: 'San Francisco',
        country: 'USA',
        customer_type: CustomerType.BUSINESS,
        industry: 'Software',
        credit_limit: 25000,
        payment_terms: 15,
      },
      {
        customer_code: `CUST-${tp}-003`,
        company_name: 'Global Retail Group',
        contact_person: 'Carol Davis',
        email: `carol.${tp}@globalretail.com`,
        phone: '+1-555-3003',
        city: 'Chicago',
        country: 'USA',
        customer_type: CustomerType.BUSINESS,
        industry: 'Retail',
        credit_limit: 75000,
        payment_terms: 45,
      },
      {
        customer_code: `CUST-${tp}-004`,
        company_name: 'Healthcare Plus',
        contact_person: 'David Wilson',
        email: `david.${tp}@healthcareplus.com`,
        phone: '+1-555-3004',
        city: 'Boston',
        country: 'USA',
        customer_type: CustomerType.BUSINESS,
        industry: 'Healthcare',
        credit_limit: 100000,
        payment_terms: 30,
      },
      {
        customer_code: `CUST-${tp}-005`,
        company_name: 'EduTech Solutions',
        contact_person: 'Emma Brown',
        email: `emma.${tp}@edutech.com`,
        phone: '+1-555-3005',
        city: 'Austin',
        country: 'USA',
        customer_type: CustomerType.BUSINESS,
        industry: 'Education',
        credit_limit: 30000,
        payment_terms: 30,
      },
    ];

    for (const cData of customers) {
      let customer = await this.customerRepo.findOne({
        where: { customer_code: cData.customer_code, tenant_id: tenantId },
      });
      if (!customer) {
        customer = await this.customerRepo.save({
          ...cData,
          tenant_id: tenantId,
          status: CustomerStatus.ACTIVE,
        });
        console.log(`  ✓ Created customer: ${cData.company_name}`);
      }
      // Add a contact for each customer
      const existingContact = await this.contactRepo.findOne({
        where: { customer_id: customer.id, tenant_id: tenantId },
      });
      if (!existingContact) {
        const [firstName, ...lastParts] = cData.contact_person.split(' ');
        await this.contactRepo.save({
          customer_id: customer.id,
          first_name: firstName,
          last_name: lastParts.join(' ') || 'N/A',
          email: cData.email,
          phone: cData.phone,
          position: 'Procurement Manager',
          is_primary: true,
          is_decision_maker: true,
          tenant_id: tenantId,
        });
      }
    }
  }

  private async seedLeads(tenantId: string): Promise<void> {
    console.log('🎯 Seeding CRM leads...');
    const tp = tenantId.substring(0, 8);
    const leads = [
      {
        lead_code: `LEAD-${tp}-001`,
        company_name: 'Startup Ventures',
        contact_person: 'Frank Lee',
        email: `frank.${tp}@startupv.com`,
        phone: '+1-555-4001',
        source: LeadSource.WEBSITE,
        status: LeadStatus.NEW,
        score: 75,
        expected_revenue: 15000,
        probability: 30,
      },
      {
        lead_code: `LEAD-${tp}-002`,
        company_name: 'Manufacturing Corp',
        contact_person: 'Grace Kim',
        email: `grace.${tp}@mfgcorp.com`,
        phone: '+1-555-4002',
        source: LeadSource.REFERRAL,
        status: LeadStatus.QUALIFIED,
        score: 85,
        expected_revenue: 45000,
        probability: 60,
      },
      {
        lead_code: `LEAD-${tp}-003`,
        company_name: 'Logistics Pro',
        contact_person: 'Henry Zhang',
        email: `henry.${tp}@logpro.com`,
        phone: '+1-555-4003',
        source: LeadSource.TRADE_SHOW,
        status: LeadStatus.PROPOSAL,
        score: 90,
        expected_revenue: 80000,
        probability: 75,
      },
      {
        lead_code: `LEAD-${tp}-004`,
        company_name: 'Finance Group',
        contact_person: 'Iris Patel',
        email: `iris.${tp}@fingroup.com`,
        phone: '+1-555-4004',
        source: LeadSource.COLD_CALL,
        status: LeadStatus.CONTACTED,
        score: 60,
        expected_revenue: 20000,
        probability: 25,
      },
      {
        lead_code: `LEAD-${tp}-005`,
        company_name: 'Media Agency',
        contact_person: 'Jack Thompson',
        email: `jack.${tp}@mediaagency.com`,
        phone: '+1-555-4005',
        source: LeadSource.SOCIAL_MEDIA,
        status: LeadStatus.NEGOTIATION,
        score: 95,
        expected_revenue: 120000,
        probability: 85,
      },
    ];
    for (const l of leads) {
      const existing = await this.leadRepo.findOne({
        where: { lead_code: l.lead_code, tenant_id: tenantId },
      });
      if (!existing) {
        await this.leadRepo.save({
          ...l,
          tenant_id: tenantId,
          next_follow_up: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        console.log(`  ✓ Created lead: ${l.company_name}`);
      }
    }
  }

  private async seedEmployees(tenantId: string): Promise<void> {
    console.log('👔 Seeding HR employees...');
    const tenantPrefix = tenantId.substring(0, 8);
    const employees = [
      {
        employee_code: `EMP-001-${tenantPrefix}`,
        first_name: 'James',
        last_name: 'Anderson',
        email: `james.anderson.${tenantPrefix}@company.com`,
        phone: '+1-555-5001',
        department: 'Management',
        position: 'CEO',
        hire_date: new Date('2020-01-15'),
        salary: 150000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-002-${tenantPrefix}`,
        first_name: 'Linda',
        last_name: 'Roberts',
        email: `linda.roberts.${tenantPrefix}@company.com`,
        phone: '+1-555-5002',
        department: 'Finance',
        position: 'CFO',
        hire_date: new Date('2020-03-01'),
        salary: 120000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-003-${tenantPrefix}`,
        first_name: 'Michael',
        last_name: 'Scott',
        email: `michael.scott.${tenantPrefix}@company.com`,
        phone: '+1-555-5003',
        department: 'Sales',
        position: 'Sales Manager',
        hire_date: new Date('2021-06-15'),
        salary: 85000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-004-${tenantPrefix}`,
        first_name: 'Patricia',
        last_name: 'Williams',
        email: `patricia.williams.${tenantPrefix}@company.com`,
        phone: '+1-555-5004',
        department: 'Accounting',
        position: 'Senior Accountant',
        hire_date: new Date('2021-09-01'),
        salary: 70000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-005-${tenantPrefix}`,
        first_name: 'Robert',
        last_name: 'Johnson',
        email: `robert.johnson.${tenantPrefix}@company.com`,
        phone: '+1-555-5005',
        department: 'Warehouse',
        position: 'Warehouse Manager',
        hire_date: new Date('2022-01-10'),
        salary: 60000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-006-${tenantPrefix}`,
        first_name: 'Susan',
        last_name: 'Davis',
        email: `susan.davis.${tenantPrefix}@company.com`,
        phone: '+1-555-5006',
        department: 'HR',
        position: 'HR Manager',
        hire_date: new Date('2022-04-01'),
        salary: 65000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-007-${tenantPrefix}`,
        first_name: 'Thomas',
        last_name: 'Miller',
        email: `thomas.miller.${tenantPrefix}@company.com`,
        phone: '+1-555-5007',
        department: 'IT',
        position: 'IT Manager',
        hire_date: new Date('2022-07-15'),
        salary: 90000,
        employment_type: EmploymentType.FULL_TIME,
      },
      {
        employee_code: `EMP-008-${tenantPrefix}`,
        first_name: 'Nancy',
        last_name: 'Wilson',
        email: `nancy.wilson.${tenantPrefix}@company.com`,
        phone: '+1-555-5008',
        department: 'Sales',
        position: 'Sales Representative',
        hire_date: new Date('2023-01-05'),
        salary: 55000,
        employment_type: EmploymentType.FULL_TIME,
      },
    ];
    for (const e of employees) {
      const existing = await this.employeeRepo.findOne({
        where: { employee_code: e.employee_code },
      });
      if (!existing) {
        await this.employeeRepo.save({
          ...e,
          tenant_id: tenantId,
          status: EmploymentStatus.ACTIVE,
          country: 'USA',
          city: 'San Francisco',
        });
        console.log(`  ✓ Created employee: ${e.first_name} ${e.last_name}`);
      }
    }
  }

  private async seedProcurement(tenantId: string): Promise<void> {
    console.log('📋 Seeding procurement data...');
    const suppliers = await this.supplierRepo.find({
      where: { tenant_id: tenantId },
    });
    const inventory = await this.inventoryRepo.find({
      where: { tenant_id: tenantId },
    });
    if (!suppliers.length || !inventory.length) return;

    // Purchase Requisitions
    const tp = tenantId.substring(0, 8);
    const requisitions = [
      {
        requisition_number: `PR-${tp}-001`,
        department: 'IT',
        status: RequisitionStatus.APPROVED,
        priority: RequisitionPriority.HIGH,
        purpose: 'Quarterly laptop refresh for development team',
      },
      {
        requisition_number: `PR-${tp}-002`,
        department: 'Sales',
        status: RequisitionStatus.PENDING_APPROVAL,
        priority: RequisitionPriority.MEDIUM,
        purpose: 'Sales team mobile devices',
      },
      {
        requisition_number: `PR-${tp}-003`,
        department: 'Operations',
        status: RequisitionStatus.DRAFT,
        priority: RequisitionPriority.LOW,
        purpose: 'Office furniture replacement',
      },
      {
        requisition_number: `PR-${tp}-004`,
        department: 'Warehouse',
        status: RequisitionStatus.CONVERTED,
        priority: RequisitionPriority.URGENT,
        purpose: 'Emergency stock replenishment',
      },
    ];

    for (const prData of requisitions) {
      const existing = await this.prRepo.findOne({
        where: { requisition_number: prData.requisition_number },
      });
      if (!existing) {
        const pr = await this.prRepo.save({
          ...prData,
          tenant_id: tenantId,
          requisition_date: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ),
          required_by_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          requested_by: '00000000-0000-0000-0000-000000000001',
        });
        // Add items
        const inv = inventory[Math.floor(Math.random() * inventory.length)];
        await this.prItemRepo.save({
          requisition_id: pr.id,
          product_id: inv.id,
          product_name: inv.product_name,
          quantity: Math.floor(Math.random() * 10) + 2,
          estimated_price: Number(inv.unit_cost),
          total_estimated: Number(inv.unit_cost) * 5,
          unit: 'pcs',
          tenant_id: tenantId,
        });
        console.log(`  ✓ Created requisition: ${prData.requisition_number}`);
      }
    }

    // RFQs
    const rfqs = [
      {
        rfq_number: `RFQ-${tp}-001`,
        title: 'Laptop Supply Q1 2024',
        status: RfqStatus.RESPONSES_RECEIVED,
      },
      {
        rfq_number: `RFQ-${tp}-002`,
        title: 'Office Furniture Procurement',
        status: RfqStatus.SENT,
      },
      {
        rfq_number: `RFQ-${tp}-003`,
        title: 'IT Equipment Annual Contract',
        status: RfqStatus.EVALUATED,
      },
    ];

    for (const rfqData of rfqs) {
      const existing = await this.rfqRepo.findOne({
        where: { rfq_number: rfqData.rfq_number },
      });
      if (!existing) {
        const rfq = await this.rfqRepo.save({
          ...rfqData,
          tenant_id: tenantId,
          rfq_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          submission_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          vendor_ids: suppliers.slice(0, 2).map((s) => s.id),
          description: `RFQ for ${rfqData.title}`,
          created_by: '00000000-0000-0000-0000-000000000001',
        });
        const inv = inventory[Math.floor(Math.random() * inventory.length)];
        await this.rfqItemRepo.save({
          rfq_id: rfq.id,
          product_name: inv.product_name,
          quantity: 10,
          unit: 'pcs',
          tenant_id: tenantId,
        });
        console.log(`  ✓ Created RFQ: ${rfqData.rfq_number}`);
      }
    }

    // Purchase Orders
    const pos = [
      {
        po_number: `PO-${tp}-001`,
        status: PurchaseOrderStatus.APPROVED,
        subtotal: 12000,
        total_amount: 13200,
      },
      {
        po_number: `PO-${tp}-002`,
        status: PurchaseOrderStatus.SENT,
        subtotal: 8500,
        total_amount: 9350,
      },
      {
        po_number: `PO-${tp}-003`,
        status: PurchaseOrderStatus.RECEIVED,
        subtotal: 5000,
        total_amount: 5500,
      },
      {
        po_number: `PO-${tp}-004`,
        status: PurchaseOrderStatus.PENDING_APPROVAL,
        subtotal: 22000,
        total_amount: 24200,
      },
    ];

    for (const poData of pos) {
      const existing = await this.poRepo.findOne({
        where: { po_number: poData.po_number },
      });
      if (!existing) {
        const supplier =
          suppliers[Math.floor(Math.random() * suppliers.length)];
        const po = await this.poRepo.save({
          ...poData,
          tenant_id: tenantId,
          vendor_id: supplier.id,
          order_date: new Date(
            Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000,
          ),
          expected_delivery_date: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ),
          tax_amount: poData.subtotal * 0.1,
          tax_rate: 10,
          payment_terms: 'Net 30',
          created_by: '00000000-0000-0000-0000-000000000001',
        });
        const inv = inventory[Math.floor(Math.random() * inventory.length)];
        await this.poItemRepo.save({
          purchase_order_id: po.id,
          product_id: inv.id,
          product_name: inv.product_name,
          quantity_ordered: 10,
          quantity_received:
            poData.status === PurchaseOrderStatus.RECEIVED ? 10 : 0,
          unit_price: Number(inv.unit_cost),
          total: Number(inv.unit_cost) * 10,
          unit: 'pcs',
          tenant_id: tenantId,
        });
        console.log(`  ✓ Created PO: ${poData.po_number}`);
      }
    }
  }

  private async seedAccountingEntries(tenantId: string): Promise<void> {
    console.log('💰 Seeding accounting entries...');
    const accounts = await this.coaRepo.find({
      where: { tenant_id: tenantId },
    });
    const customers = await this.customerRepo.find({
      where: { tenant_id: tenantId },
    });
    const suppliers = await this.supplierRepo.find({
      where: { tenant_id: tenantId },
    });
    if (!accounts.length) return;

    const p = tenantId.substring(0, 4);
    const getAccount = (suffix: string) =>
      accounts.find((a) => a.account_code === `${p}-${suffix}`);

    // Journal Entries
    const journalEntries = [
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-001`,
        entry_type: JournalEntryType.SALES,
        description: 'Sales revenue - Acme Corporation',
        amount: 15999.9,
        debitCode: '1200',
        creditCode: '4000',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-002`,
        entry_type: JournalEntryType.PURCHASE,
        description: 'Inventory purchase - TechPro Distributors',
        amount: 12000.0,
        debitCode: '1300',
        creditCode: '2000',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-003`,
        entry_type: JournalEntryType.PAYMENT,
        description: 'Payment received from TechStart Inc',
        amount: 8500.0,
        debitCode: '1100',
        creditCode: '1200',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-004`,
        entry_type: JournalEntryType.GENERAL,
        description: 'Monthly rent expense',
        amount: 5000.0,
        debitCode: '5200',
        creditCode: '1100',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-005`,
        entry_type: JournalEntryType.GENERAL,
        description: 'Salaries payable',
        amount: 45000.0,
        debitCode: '5100',
        creditCode: '2100',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-006`,
        entry_type: JournalEntryType.SALES,
        description: 'Service revenue - Healthcare Plus',
        amount: 22000.0,
        debitCode: '1200',
        creditCode: '4100',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-007`,
        entry_type: JournalEntryType.RECEIPT,
        description: 'Cash receipt - Global Retail Group',
        amount: 30000.0,
        debitCode: '1100',
        creditCode: '1200',
      },
      {
        entry_number: `JE-${tenantId.substring(0, 8)}-008`,
        entry_type: JournalEntryType.ADJUSTMENT,
        description: 'Inventory adjustment - Q1 count',
        amount: 2500.0,
        debitCode: '5000',
        creditCode: '1300',
      },
    ];

    for (const jeData of journalEntries) {
      const existing = await this.jeRepo.findOne({
        where: { entry_number: jeData.entry_number },
      });
      if (!existing) {
        const debitAccount = getAccount(jeData.debitCode);
        const creditAccount = getAccount(jeData.creditCode);
        if (!debitAccount || !creditAccount) continue;

        const je = await this.jeRepo.save({
          entry_number: jeData.entry_number,
          entry_date: new Date(
            Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
          ),
          entry_type: jeData.entry_type,
          status: JournalEntryStatus.POSTED,
          description: jeData.description,
          total_debit: jeData.amount,
          total_credit: jeData.amount,
          tenant_id: tenantId,
          posted_at: new Date(),
        });

        await this.jeLineRepo.save([
          {
            journal_entry_id: je.id,
            account_id: debitAccount.id,
            description: jeData.description,
            debit: jeData.amount,
            credit: 0,
            line_number: 1,
            tenant_id: tenantId,
          },
          {
            journal_entry_id: je.id,
            account_id: creditAccount.id,
            description: jeData.description,
            debit: 0,
            credit: jeData.amount,
            line_number: 2,
            tenant_id: tenantId,
          },
        ]);
        console.log(`  ✓ Created journal entry: ${jeData.entry_number}`);
      }
    }

    // AR Invoices
    if (customers.length) {
      const arInvoices = [
        {
          invoice_number: `INV-${tenantId.substring(0, 8)}-001`,
          total_amount: 15999.9,
          paid_amount: 0,
          status: ARStatus.OPEN,
          description: 'Laptop and accessories order',
        },
        {
          invoice_number: `INV-${tenantId.substring(0, 8)}-002`,
          total_amount: 8500.0,
          paid_amount: 8500.0,
          status: ARStatus.PAID,
          description: 'Software licenses Q1',
        },
        {
          invoice_number: `INV-${tenantId.substring(0, 8)}-003`,
          total_amount: 22000.0,
          paid_amount: 10000.0,
          status: ARStatus.PARTIALLY_PAID,
          description: 'IT equipment supply',
        },
        {
          invoice_number: `INV-${tenantId.substring(0, 8)}-004`,
          total_amount: 5200.0,
          paid_amount: 0,
          status: ARStatus.OVERDUE,
          description: 'Office furniture',
        },
        {
          invoice_number: `INV-${tenantId.substring(0, 8)}-005`,
          total_amount: 30000.0,
          paid_amount: 30000.0,
          status: ARStatus.PAID,
          description: 'Annual service contract',
        },
      ];
      for (let i = 0; i < arInvoices.length; i++) {
        const inv = arInvoices[i];
        const existing = await this.arRepo.findOne({
          where: { invoice_number: inv.invoice_number },
        });
        if (!existing) {
          const customer = customers[i % customers.length];
          await this.arRepo.save({
            ...inv,
            customer_id: customer.id,
            balance_amount: inv.total_amount - inv.paid_amount,
            invoice_date: new Date(
              Date.now() - (i + 1) * 10 * 24 * 60 * 60 * 1000,
            ),
            due_date: new Date(Date.now() + (30 - i * 5) * 24 * 60 * 60 * 1000),
            tenant_id: tenantId,
          });
          console.log(`  ✓ Created AR invoice: ${inv.invoice_number}`);
        }
      }
    }

    // AP Bills
    if (suppliers.length) {
      const apBills = [
        {
          bill_number: `BILL-${tenantId.substring(0, 8)}-001`,
          total_amount: 12000.0,
          paid_amount: 12000.0,
          status: APStatus.PAID,
          notes: 'Laptop batch purchase',
        },
        {
          bill_number: `BILL-${tenantId.substring(0, 8)}-002`,
          total_amount: 8500.0,
          paid_amount: 0,
          status: APStatus.OPEN,
          notes: 'Office supplies Q1',
        },
        {
          bill_number: `BILL-${tenantId.substring(0, 8)}-003`,
          total_amount: 25000.0,
          paid_amount: 10000.0,
          status: APStatus.PARTIALLY_PAID,
          notes: 'Furniture order',
        },
        {
          bill_number: `BILL-${tenantId.substring(0, 8)}-004`,
          total_amount: 3200.0,
          paid_amount: 0,
          status: APStatus.OVERDUE,
          notes: 'Software licenses',
        },
      ];
      for (let i = 0; i < apBills.length; i++) {
        const bill = apBills[i];
        const existing = await this.apRepo.findOne({
          where: { bill_number: bill.bill_number },
        });
        if (!existing) {
          const supplier = suppliers[i % suppliers.length];
          await this.apRepo.save({
            ...bill,
            vendor_id: supplier.id,
            balance_amount: bill.total_amount - bill.paid_amount,
            bill_date: new Date(Date.now() - (i + 1) * 8 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() + (45 - i * 7) * 24 * 60 * 60 * 1000),
            tenant_id: tenantId,
          });
          console.log(`  ✓ Created AP bill: ${bill.bill_number}`);
        }
      }
    }
  }

  private async seedShipments(tenantId: string): Promise<void> {
    console.log('📦 Seeding shipments...');
    const couriers = await this.courierRepo.find({
      where: { tenant_id: tenantId },
    });
    if (!couriers.length) return;

    const tenantPrefix = tenantId.substring(0, 8);
    const shipments = [
      {
        tracking_number: `TRK-${tenantPrefix}-001`,
        status: ShipmentStatus.DELIVERED,
        priority: ShipmentPriority.NORMAL,
        origin_name: 'Main Warehouse',
        origin_address: '100 Industrial Park, San Francisco, CA',
        destination_name: 'Acme Corporation',
        destination_address: '500 Business Ave, New York, NY',
        destination_city: 'New York',
        weight: 15.5,
        shipping_cost: 45.0,
        total_cost: 45.0,
      },
      {
        tracking_number: `TRK-${tenantPrefix}-002`,
        status: ShipmentStatus.IN_TRANSIT,
        priority: ShipmentPriority.HIGH,
        origin_name: 'Main Warehouse',
        origin_address: '100 Industrial Park, San Francisco, CA',
        destination_name: 'TechStart Inc',
        destination_address: '200 Tech Blvd, San Francisco, CA',
        destination_city: 'San Francisco',
        weight: 8.2,
        shipping_cost: 25.0,
        total_cost: 25.0,
      },
      {
        tracking_number: `TRK-${tenantPrefix}-003`,
        status: ShipmentStatus.PENDING,
        priority: ShipmentPriority.NORMAL,
        origin_name: 'East Distribution Center',
        origin_address: '200 Logistics Ave, New York, NY',
        destination_name: 'Global Retail Group',
        destination_address: '300 Retail St, Chicago, IL',
        destination_city: 'Chicago',
        weight: 32.0,
        shipping_cost: 85.0,
        total_cost: 85.0,
      },
      {
        tracking_number: `TRK-${tenantPrefix}-004`,
        status: ShipmentStatus.OUT_FOR_DELIVERY,
        priority: ShipmentPriority.URGENT,
        origin_name: 'West Coast Hub',
        origin_address: '300 Harbor Blvd, Los Angeles, CA',
        destination_name: 'Healthcare Plus',
        destination_address: '400 Medical Center Dr, Boston, MA',
        destination_city: 'Boston',
        weight: 5.0,
        shipping_cost: 120.0,
        total_cost: 120.0,
      },
      {
        tracking_number: `TRK-${tenantPrefix}-005`,
        status: ShipmentStatus.PICKED_UP,
        priority: ShipmentPriority.NORMAL,
        origin_name: 'Main Warehouse',
        origin_address: '100 Industrial Park, San Francisco, CA',
        destination_name: 'EduTech Solutions',
        destination_address: '600 Campus Dr, Austin, TX',
        destination_city: 'Austin',
        weight: 22.0,
        shipping_cost: 65.0,
        total_cost: 65.0,
      },
      {
        tracking_number: `TRK-${tenantPrefix}-006`,
        status: ShipmentStatus.FAILED,
        priority: ShipmentPriority.HIGH,
        origin_name: 'Main Warehouse',
        origin_address: '100 Industrial Park, San Francisco, CA',
        destination_name: 'Startup Ventures',
        destination_address: '700 Innovation Way, Seattle, WA',
        destination_city: 'Seattle',
        weight: 10.0,
        shipping_cost: 35.0,
        total_cost: 35.0,
      },
    ];

    for (let i = 0; i < shipments.length; i++) {
      const s = shipments[i];
      const existing = await this.shipmentRepo.findOne({
        where: { tracking_number: s.tracking_number },
      });
      if (!existing) {
        const courier = couriers[i % couriers.length];
        await this.shipmentRepo.save({
          ...s,
          courier_id: courier.id,
          tenant_id: tenantId,
          package_count: 1,
          weight_unit: 'kg',
          pickup_date: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000),
          estimated_delivery_date: new Date(
            Date.now() + (3 - i) * 24 * 60 * 60 * 1000,
          ),
          actual_delivery_date:
            s.status === ShipmentStatus.DELIVERED ? new Date() : undefined,
          tracking_history: [
            {
              status: 'pending',
              timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              location: s.origin_address,
              note: 'Shipment created',
            },
            {
              status: s.status,
              timestamp: new Date(),
              location: s.destination_city,
              note: `Status updated to ${s.status}`,
            },
          ],
        });
        console.log(`  ✓ Created shipment: ${s.tracking_number}`);
      }
    }
  }

  private async seedPageAccess(tenantId: string): Promise<void> {
    console.log('🔒 Seeding page access settings...');
    const roles = await this.roleRepo.find({ where: { tenant_id: tenantId } });
    for (const role of roles) {
      const isAdmin = ['Super Admin', 'Admin'].includes(role.name);
      await this.settingsService.initializeDefaultAccess(
        role.id,
        tenantId,
        isAdmin,
      );
      console.log(`  ✓ Initialized page access for: ${role.name}`);
    }
  }
}
