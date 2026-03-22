import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageAccessEntity } from './entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { PlanFeature } from '../subscriptions/subscription.constants';

export const DEFAULT_PAGES = [
  { key: 'dashboard', name: 'Dashboard', path: '/', category: 'Core' },
  { key: 'products', name: 'Products & Services', path: '/products', category: 'Operations' },
  { key: 'suppliers', name: 'Suppliers', path: '/suppliers', category: 'Operations' },
  { key: 'categories', name: 'Categories', path: '/categories', category: 'Operations' },
  { key: 'inventory', name: 'Inventory', path: '/inventory', category: 'Operations' },
  { key: 'transactions', name: 'Transactions', path: '/transactions', category: 'Operations' },
  {
    key: 'accounting',
    name: 'Accounting',
    path: '/accounting',
    category: 'Finance',
    requiredFeature: PlanFeature.ACCOUNTING,
  },
  { key: 'payments', name: 'Payments', path: '/payments', category: 'Finance' },
  { key: 'crm', name: 'CRM', path: '/crm', category: 'Sales' },
  { key: 'hr', name: 'Human Resources', path: '/hr', category: 'People' },
  { key: 'procurement', name: 'Procurement', path: '/procurement', category: 'Operations' },
  {
    key: 'warehouse',
    name: 'Warehouse',
    path: '/warehouse',
    category: 'Operations',
    requiredFeature: PlanFeature.WAREHOUSE,
  },
  { key: 'transportation', name: 'Transportation', path: '/transportation', category: 'Logistics' },
  { key: 'projects', name: 'Projects', path: '/projects', category: 'Execution' },
  { key: 'manufacturing', name: 'Manufacturing', path: '/manufacturing', category: 'Operations' },
  { key: 'equipment', name: 'Assets', path: '/equipment', category: 'Operations' },
  { key: 'services', name: 'Services', path: '/services', category: 'Operations' },
  { key: 'communication', name: 'Communication', path: '/communication', category: 'Collaboration' },
  { key: 'compliance', name: 'Compliance', path: '/compliance', category: 'Governance' },
  {
    key: 'bi',
    name: 'BI & Reports',
    path: '/bi',
    category: 'Analytics',
    requiredFeature: PlanFeature.REPORTS,
  },
  { key: 'users', name: 'Users', path: '/users', category: 'Administration' },
  { key: 'modules', name: 'Modules', path: '/modules', category: 'Administration' },
  { key: 'rbac', name: 'RBAC', path: '/rbac', category: 'Administration' },
  { key: 'settings', name: 'Settings', path: '/settings', category: 'Administration' },
];

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(PageAccessEntity)
    private pageAccessRepo: Repository<PageAccessEntity>,
    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,
  ) {}

  async getPageAccessForRole(
    roleId: string,
    tenantId: string,
  ): Promise<PageAccessEntity[]> {
    return this.pageAccessRepo.find({
      where: { role_id: roleId, tenant_id: tenantId },
    });
  }

  async getPageAccessForUser(
    roleIds: string[],
    tenantId: string,
  ): Promise<any> {
    const accessList = await this.pageAccessRepo.find({
      where: roleIds.map((roleId) => ({ role_id: roleId, tenant_id: tenantId })),
    });

    // Merge permissions from all roles (most permissive wins)
    const pageMap = new Map<string, any>();

    accessList.forEach((access) => {
      const existing = pageMap.get(access.page_key);

      if (!existing) {
        pageMap.set(access.page_key, {
          page_key: access.page_key,
          page_name: access.page_name,
          page_path: access.page_path,
          can_view: access.can_view,
          can_create: access.can_create,
          can_edit: access.can_edit,
          can_delete: access.can_delete,
          can_export: access.can_export,
        });
      } else {
        // Page visibility is deny-precedence: if any assigned role disables view,
        // the page should be hidden/blocked for the user.
        existing.can_view = existing.can_view && access.can_view;

        // Action permissions remain permissive across roles, but only matter
        // once page visibility has been granted.
        existing.can_create = existing.can_create || access.can_create;
        existing.can_edit = existing.can_edit || access.can_edit;
        existing.can_delete = existing.can_delete || access.can_delete;
        existing.can_export = existing.can_export || access.can_export;
      }
    });

    return Array.from(pageMap.values());
  }

  async getPageAccessForUserById(
    userId: string,
    tenantId: string,
  ): Promise<any> {
    // Fetch user's roles
    const userRoles = await this.userRoleRepo.find({
      where: { user_id: userId },
    });

    const roleIds = userRoles.map((ur) => ur.role_id);
    return this.getPageAccessForUser(roleIds, tenantId);
  }

  getPageCatalog() {
    return DEFAULT_PAGES;
  }

  async getPageAccessMatrixForRole(roleId: string, tenantId: string) {
    const accessList = await this.getPageAccessForRole(roleId, tenantId);
    const accessMap = new Map(accessList.map((access) => [access.page_key, access]));

    return DEFAULT_PAGES.map((page) => {
      const access = accessMap.get(page.key);

      return {
        page_key: page.key,
        page_name: page.name,
        page_path: page.path,
        category: page.category,
        required_feature: page.requiredFeature ?? null,
        can_view: access?.can_view ?? true,
        can_create: access?.can_create ?? false,
        can_edit: access?.can_edit ?? false,
        can_delete: access?.can_delete ?? false,
        can_export: access?.can_export ?? false,
        custom_permissions: access?.custom_permissions ?? null,
      };
    });
  }

  async setPageAccess(
    roleId: string,
    tenantId: string,
    pageKey: string,
    permissions: Partial<PageAccessEntity>,
  ): Promise<PageAccessEntity> {
    let access = await this.pageAccessRepo.findOne({
      where: { role_id: roleId, tenant_id: tenantId, page_key: pageKey },
    });

    const page = DEFAULT_PAGES.find((p) => p.key === pageKey);

    if (!access) {
      access = this.pageAccessRepo.create({
        role_id: roleId,
        tenant_id: tenantId,
        page_key: pageKey,
        page_name: page?.name || pageKey,
        page_path: page?.path || `/${pageKey}`,
        ...permissions,
      });
    } else {
      Object.assign(access, permissions);
    }

    return this.pageAccessRepo.save(access);
  }

  async initializeDefaultAccess(
    roleId: string,
    tenantId: string,
    isAdmin = false,
  ): Promise<void> {
    for (const page of DEFAULT_PAGES) {
      const existing = await this.pageAccessRepo.findOne({
        where: { role_id: roleId, tenant_id: tenantId, page_key: page.key },
      });

      if (!existing) {
        await this.pageAccessRepo.save({
          role_id: roleId,
          tenant_id: tenantId,
          page_key: page.key,
          page_name: page.name,
          page_path: page.path,
          can_view: true,
          can_create: isAdmin,
          can_edit: isAdmin,
          can_delete: isAdmin,
          can_export: isAdmin,
        });
      }
    }
  }

  async bulkSetPageAccess(
    roleId: string,
    tenantId: string,
    accessList: Array<{
      page_key: string;
      permissions: Partial<PageAccessEntity>;
    }>,
  ): Promise<PageAccessEntity[]> {
    const results: PageAccessEntity[] = [];

    for (const item of accessList) {
      const access = await this.setPageAccess(
        roleId,
        tenantId,
        item.page_key,
        item.permissions,
      );
      results.push(access);
    }

    return results;
  }
}
