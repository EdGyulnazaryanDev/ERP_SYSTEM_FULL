import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { InventoryEntity } from '../../modules/inventory/entities/inventory.entity';
import { SettingsService } from '../../modules/settings/settings.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ComprehensiveSeeder {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
    private settingsService: SettingsService,
  ) {}

  async seed(tenantId: string): Promise<void> {
    console.log('🌱 Starting comprehensive seeding...');

    await this.seedRoles(tenantId);
    await this.seedPermissions(tenantId);
    await this.seedRolePermissions(tenantId);
    await this.seedCategories(tenantId);
    await this.seedProducts(tenantId);
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
      {
        name: 'Admin',
        description: 'Administrative access',
        is_system: false,
      },
      {
        name: 'Manager',
        description: 'Management level access',
        is_system: false,
      },
      {
        name: 'Sales',
        description: 'Sales team access',
        is_system: false,
      },
      {
        name: 'Accountant',
        description: 'Financial access',
        is_system: false,
      },
      {
        name: 'Warehouse',
        description: 'Inventory management access',
        is_system: false,
      },
      {
        name: 'Viewer',
        description: 'Read-only access',
        is_system: false,
      },
    ];

    for (const roleData of roles) {
      const existing = await this.roleRepo.findOne({
        where: { name: roleData.name, tenant_id: tenantId },
      });

      if (!existing) {
        await this.roleRepo.save({
          ...roleData,
          tenant_id: tenantId,
        });
        console.log(`  ✓ Created role: ${roleData.name}`);
      }
    }
  }

  private async seedPermissions(tenantId: string): Promise<void> {
    console.log('🔐 Seeding permissions...');

    const permissions = [
      // Dashboard
      { resource: 'dashboard', action: 'read', description: 'View dashboard' },

      // Products
      { resource: 'products', action: 'read', description: 'View products' },
      { resource: 'products', action: 'create', description: 'Create products' },
      { resource: 'products', action: 'update', description: 'Update products' },
      { resource: 'products', action: 'delete', description: 'Delete products' },
      { resource: 'products', action: 'export', description: 'Export products' },

      // Categories
      { resource: 'categories', action: 'read', description: 'View categories' },
      { resource: 'categories', action: 'create', description: 'Create categories' },
      { resource: 'categories', action: 'update', description: 'Update categories' },
      { resource: 'categories', action: 'delete', description: 'Delete categories' },

      // Inventory
      { resource: 'inventory', action: 'read', description: 'View inventory' },
      { resource: 'inventory', action: 'create', description: 'Create inventory' },
      { resource: 'inventory', action: 'update', description: 'Update inventory' },
      { resource: 'inventory', action: 'delete', description: 'Delete inventory' },
      { resource: 'inventory', action: 'adjust', description: 'Adjust stock levels' },

      // Transactions
      { resource: 'transactions', action: 'read', description: 'View transactions' },
      { resource: 'transactions', action: 'create', description: 'Create transactions' },
      { resource: 'transactions', action: 'update', description: 'Update transactions' },
      { resource: 'transactions', action: 'delete', description: 'Delete transactions' },
      { resource: 'transactions', action: 'complete', description: 'Complete transactions' },
      { resource: 'transactions', action: 'cancel', description: 'Cancel transactions' },
      { resource: 'transactions', action: 'export', description: 'Export transactions' },

      // Finance
      { resource: 'finance', action: 'read', description: 'View financial reports' },
      { resource: 'finance', action: 'export', description: 'Export financial reports' },

      // Modules
      { resource: 'modules', action: 'read', description: 'View modules' },
      { resource: 'modules', action: 'create', description: 'Create modules' },
      { resource: 'modules', action: 'update', description: 'Update modules' },
      { resource: 'modules', action: 'delete', description: 'Delete modules' },

      // RBAC
      { resource: 'roles', action: 'read', description: 'View roles' },
      { resource: 'roles', action: 'create', description: 'Create roles' },
      { resource: 'roles', action: 'update', description: 'Update roles' },
      { resource: 'roles', action: 'delete', description: 'Delete roles' },
      { resource: 'permissions', action: 'read', description: 'View permissions' },
      { resource: 'permissions', action: 'create', description: 'Create permissions' },
      { resource: 'permissions', action: 'update', description: 'Update permissions' },
      { resource: 'permissions', action: 'delete', description: 'Delete permissions' },

      // Settings
      { resource: 'settings', action: 'read', description: 'View settings' },
      { resource: 'settings', action: 'update', description: 'Update settings' },
    ];

    for (const permData of permissions) {
      const existing = await this.permissionRepo.findOne({
        where: {
          resource: permData.resource,
          action: permData.action,
          tenant_id: tenantId,
        },
      });

      if (!existing) {
        await this.permissionRepo.save({
          ...permData,
          tenant_id: tenantId,
        });
      }
    }

    console.log(`  ✓ Created ${permissions.length} permissions`);
  }

  private async seedRolePermissions(tenantId: string): Promise<void> {
    console.log('🔗 Seeding role-permission mappings...');

    const superAdmin = await this.roleRepo.findOne({
      where: { name: 'Super Admin', tenant_id: tenantId },
    });

    const admin = await this.roleRepo.findOne({
      where: { name: 'Admin', tenant_id: tenantId },
    });

    const manager = await this.roleRepo.findOne({
      where: { name: 'Manager', tenant_id: tenantId },
    });

    const sales = await this.roleRepo.findOne({
      where: { name: 'Sales', tenant_id: tenantId },
    });

    const accountant = await this.roleRepo.findOne({
      where: { name: 'Accountant', tenant_id: tenantId },
    });

    const warehouse = await this.roleRepo.findOne({
      where: { name: 'Warehouse', tenant_id: tenantId },
    });

    const viewer = await this.roleRepo.findOne({
      where: { name: 'Viewer', tenant_id: tenantId },
    });

    const allPermissions = await this.permissionRepo.find({
      where: { tenant_id: tenantId },
    });

    // Super Admin gets all permissions
    if (superAdmin) {
      for (const permission of allPermissions) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: superAdmin.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: superAdmin.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned all permissions to Super Admin`);
    }

    // Admin gets most permissions except system settings
    if (admin) {
      const adminPerms = allPermissions.filter(
        (p) => !['settings'].includes(p.resource) || p.action === 'read',
      );
      for (const permission of adminPerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: admin.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: admin.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Admin`);
    }

    // Manager gets read/create/update for most resources
    if (manager) {
      const managerPerms = allPermissions.filter(
        (p) =>
          ['read', 'create', 'update', 'export'].includes(p.action) &&
          !['roles', 'permissions', 'settings'].includes(p.resource),
      );
      for (const permission of managerPerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: manager.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: manager.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Manager`);
    }

    // Sales gets transaction and product permissions
    if (sales) {
      const salesPerms = allPermissions.filter(
        (p) =>
          ['products', 'transactions', 'inventory', 'dashboard'].includes(
            p.resource,
          ) && ['read', 'create', 'update'].includes(p.action),
      );
      for (const permission of salesPerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: sales.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: sales.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Sales`);
    }

    // Accountant gets finance and transaction read permissions
    if (accountant) {
      const accountantPerms = allPermissions.filter(
        (p) =>
          ['finance', 'transactions', 'dashboard'].includes(p.resource) &&
          ['read', 'export'].includes(p.action),
      );
      for (const permission of accountantPerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: accountant.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: accountant.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Accountant`);
    }

    // Warehouse gets inventory permissions
    if (warehouse) {
      const warehousePerms = allPermissions.filter(
        (p) =>
          ['inventory', 'products', 'dashboard'].includes(p.resource) &&
          ['read', 'update', 'adjust'].includes(p.action),
      );
      for (const permission of warehousePerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: warehouse.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: warehouse.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Warehouse`);
    }

    // Viewer gets only read permissions
    if (viewer) {
      const viewerPerms = allPermissions.filter((p) => p.action === 'read');
      for (const permission of viewerPerms) {
        const existing = await this.rolePermissionRepo.findOne({
          where: {
            role_id: viewer.id,
            permission_id: permission.id,
          },
        });

        if (!existing) {
          await this.rolePermissionRepo.save({
            role_id: viewer.id,
            permission_id: permission.id,
          });
        }
      }
      console.log(`  ✓ Assigned permissions to Viewer`);
    }
  }

  private async seedCategories(tenantId: string): Promise<void> {
    console.log('📁 Seeding categories...');

    const categories = [
      {
        name: 'Electronics',
        description: 'Electronic devices and accessories',
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
        description: 'Office equipment and supplies',
        color: '#52c41a',
        icon: '📎',
        sort_order: 3,
      },
      {
        name: 'Furniture',
        description: 'Office and home furniture',
        color: '#fa8c16',
        icon: '🪑',
        sort_order: 4,
      },
      {
        name: 'Software',
        description: 'Software licenses and subscriptions',
        color: '#722ed1',
        icon: '💿',
        sort_order: 5,
      },
    ];

    for (const catData of categories) {
      const slug = `${tenantId.substring(0, 8)}_${catData.name.toLowerCase().replace(/\s+/g, '_')}`;

      const existing = await this.categoryRepo.findOne({
        where: { slug },
      });

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

  private async seedProducts(tenantId: string): Promise<void> {
    console.log('📦 Seeding products and inventory...');

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
      },
    ];

    for (const prodData of products) {
      const existing = await this.inventoryRepo.findOne({
        where: { sku: prodData.sku },
      });

      if (!existing) {
        await this.inventoryRepo.save({
          ...prodData,
          product_id: `prod-${prodData.sku.toLowerCase()}`,
          tenant_id: tenantId,
          reserved_quantity: 0,
          available_quantity: prodData.quantity,
        });
        console.log(`  ✓ Created product: ${prodData.product_name}`);
      }
    }
  }

  private async seedPageAccess(tenantId: string): Promise<void> {
    console.log('🔒 Seeding page access settings...');

    const roles = await this.roleRepo.find({
      where: { tenant_id: tenantId },
    });

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
