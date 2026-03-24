import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageAccessEntity } from './entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { Role } from '../roles/role.entity';
import { PlanFeature } from '../subscriptions/subscription.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export const DEFAULT_PAGES = [
  { key: 'dashboard', name: 'Dashboard', path: '/', category: 'Core' },
  { key: 'products', name: 'Products & Services', path: '/products', category: 'Operations' },
  { key: 'suppliers', name: 'Suppliers', path: '/suppliers', category: 'Operations', requiredFeature: PlanFeature.SUPPLIERS },
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
  { key: 'payments', name: 'Payments', path: '/payments', category: 'Finance', requiredFeature: PlanFeature.PAYMENTS },
  { key: 'crm', name: 'CRM', path: '/crm', category: 'Sales', requiredFeature: PlanFeature.CRM },
  { key: 'hr', name: 'Human Resources', path: '/hr', category: 'People', requiredFeature: PlanFeature.HR },
  { key: 'procurement', name: 'Procurement', path: '/procurement', category: 'Operations', requiredFeature: PlanFeature.PROCUREMENT },
  {
    key: 'warehouse',
    name: 'Warehouse',
    path: '/warehouse',
    category: 'Operations',
    requiredFeature: PlanFeature.WAREHOUSE,
  },
  { key: 'transportation', name: 'Transportation', path: '/transportation', category: 'Logistics', requiredFeature: PlanFeature.TRANSPORTATION },
  { key: 'projects', name: 'Projects', path: '/projects', category: 'Execution', requiredFeature: PlanFeature.PROJECTS },
  { key: 'manufacturing', name: 'Manufacturing', path: '/manufacturing', category: 'Operations', requiredFeature: PlanFeature.MANUFACTURING },
  { key: 'equipment', name: 'Assets', path: '/equipment', category: 'Operations', requiredFeature: PlanFeature.EQUIPMENT },
  { key: 'services', name: 'Services', path: '/services', category: 'Operations', requiredFeature: PlanFeature.SERVICES },
  { key: 'communication', name: 'Communication', path: '/communication', category: 'Collaboration', requiredFeature: PlanFeature.COMMUNICATION },
  { key: 'compliance', name: 'Compliance', path: '/compliance', category: 'Governance', requiredFeature: PlanFeature.COMPLIANCE },
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
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private readonly subscriptionsService: SubscriptionsService,
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
    options?: { bypassSubscription?: boolean },
  ): Promise<any> {
    const accessList = await this.pageAccessRepo.find({
      where: roleIds.map((roleId) => ({ role_id: roleId, tenant_id: tenantId })),
    });

    const planAllowedPages = options?.bypassSubscription
      ? new Set(DEFAULT_PAGES.map((page) => page.key))
      : await this.getPlanAllowedPageKeys(tenantId);

    const pageMap = new Map<string, any>();

    accessList.forEach((access) => {
      const existing = pageMap.get(access.page_key);

      if (!existing) {
        pageMap.set(access.page_key, {
          page_key: access.page_key,
          page_name: access.page_name,
          page_path: access.page_path,
          can_view: planAllowedPages.has(access.page_key) && access.can_view,
          can_create: planAllowedPages.has(access.page_key) && access.can_create,
          can_edit: planAllowedPages.has(access.page_key) && access.can_edit,
          can_delete: planAllowedPages.has(access.page_key) && access.can_delete,
          can_export: planAllowedPages.has(access.page_key) && access.can_export,
        });
      } else {
        existing.can_view = existing.can_view && access.can_view;
        existing.can_create =
          planAllowedPages.has(access.page_key) &&
          (existing.can_create || access.can_create);
        existing.can_edit =
          planAllowedPages.has(access.page_key) &&
          (existing.can_edit || access.can_edit);
        existing.can_delete =
          planAllowedPages.has(access.page_key) &&
          (existing.can_delete || access.can_delete);
        existing.can_export =
          planAllowedPages.has(access.page_key) &&
          (existing.can_export || access.can_export);
      }
    });

    return Array.from(pageMap.values());
  }

  async getPageAccessForUserById(
    userId: string,
    tenantId: string,
  ): Promise<any> {
    const isSysAdmin = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);

    // System admin / superadmin gets full access to all pages — no RBAC rows needed
    if (isSysAdmin) {
      return DEFAULT_PAGES.map((page) => ({
        page_key: page.key,
        page_name: page.name,
        page_path: page.path,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_export: true,
      }));
    }

    const userRoles = await this.userRoleRepo.find({
      where: { user_id: userId },
    });

    if (userRoles.length === 0) {
      // No roles assigned — deny everything
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.role_id);

    // Auto-initialize default access rows for any role that has none yet
    for (const roleId of roleIds) {
      const existingCount = await this.pageAccessRepo.count({
        where: { role_id: roleId, tenant_id: tenantId },
      });
      if (existingCount === 0) {
        // Initialize with view-only defaults (no create/edit/delete/export)
        await this.initializeDefaultAccess(roleId, tenantId, false);
      }
    }

    return this.getPageAccessForUser(roleIds, tenantId, { bypassSubscription: false });
  }

  async getPageCatalog(tenantId: string, userId: string) {
    const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);
    const allowedPageKeys = isSuperAdmin
      ? new Set(DEFAULT_PAGES.map((page) => page.key))
      : await this.getPlanAllowedPageKeys(tenantId);

    return DEFAULT_PAGES.filter((page) => allowedPageKeys.has(page.key));
  }

  async getPageAccessMatrixForRole(
    roleId: string,
    tenantId: string,
    userId: string,
  ) {
    await this.assertCanManagePageAccess(userId, tenantId, roleId);
    const accessList = await this.getPageAccessForRole(roleId, tenantId);
    const accessMap = new Map(accessList.map((access) => [access.page_key, access]));

    // Superadmin sees all pages as plan_included regardless of subscription
    const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);
    const allowedPageKeys = isSuperAdmin
      ? new Set(DEFAULT_PAGES.map((p) => p.key))
      : await this.getPlanAllowedPageKeys(tenantId);

    return DEFAULT_PAGES.map((page) => {
      const access = accessMap.get(page.key);
      const planIncluded = allowedPageKeys.has(page.key);

      return {
        page_key: page.key,
        page_name: page.name,
        page_path: page.path,
        category: page.category,
        required_feature: page.requiredFeature ?? null,
        plan_included: planIncluded,
        locked_by_subscription: !planIncluded,
        can_view: planIncluded ? access?.can_view ?? true : false,
        can_create: planIncluded ? access?.can_create ?? false : false,
        can_edit: planIncluded ? access?.can_edit ?? false : false,
        can_delete: planIncluded ? access?.can_delete ?? false : false,
        can_export: planIncluded ? access?.can_export ?? false : false,
        custom_permissions: access?.custom_permissions ?? null,
      };
    });
  }

  async setPageAccess(
    roleId: string,
    tenantId: string,
    userId: string,
    pageKey: string,
    permissions: Partial<PageAccessEntity>,
  ): Promise<PageAccessEntity> {
    await this.assertCanManagePageAccess(userId, tenantId, roleId);
    let access = await this.pageAccessRepo.findOne({
      where: { role_id: roleId, tenant_id: tenantId, page_key: pageKey },
    });

    const page = DEFAULT_PAGES.find((p) => p.key === pageKey);
    const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);
    const allowedPageKeys = isSuperAdmin
      ? new Set(DEFAULT_PAGES.map((p) => p.key))
      : await this.getPlanAllowedPageKeys(tenantId);
    const sanitizedPermissions = this.sanitizePermissions(
      permissions,
      allowedPageKeys.has(pageKey),
    );

    if (!access) {
      access = this.pageAccessRepo.create({
        role_id: roleId,
        tenant_id: tenantId,
        page_key: pageKey,
        page_name: page?.name || pageKey,
        page_path: page?.path || `/${pageKey}`,
        ...sanitizedPermissions,
      });
    } else {
      Object.assign(access, sanitizedPermissions);
    }

    return this.pageAccessRepo.save(access);
  }

  async initializeDefaultAccess(
    roleId: string,
    tenantId: string,
    userIdOrIsAdmin: string | boolean,
    isAdmin = false,
  ): Promise<void> {
    const userId =
      typeof userIdOrIsAdmin === 'string' ? userIdOrIsAdmin : undefined;
    const effectiveIsAdmin =
      typeof userIdOrIsAdmin === 'boolean' ? userIdOrIsAdmin : isAdmin;

    if (userId) {
      await this.assertCanManagePageAccess(userId, tenantId, roleId);
    }
    const allowedPageKeys = await this.getPlanAllowedPageKeys(tenantId);

    for (const page of DEFAULT_PAGES) {
      const existing = await this.pageAccessRepo.findOne({
        where: { role_id: roleId, tenant_id: tenantId, page_key: page.key },
      });

      if (!existing) {
        const planIncluded = allowedPageKeys.has(page.key);
        await this.pageAccessRepo.save({
          role_id: roleId,
          tenant_id: tenantId,
          page_key: page.key,
          page_name: page.name,
          page_path: page.path,
          can_view: planIncluded,
          can_create: planIncluded && effectiveIsAdmin,
          can_edit: planIncluded && effectiveIsAdmin,
          can_delete: planIncluded && effectiveIsAdmin,
          can_export: planIncluded && effectiveIsAdmin,
        });
      }
    }
  }

  async bulkSetPageAccess(
    roleId: string,
    tenantId: string,
    userId: string,
    accessList: Array<{
      page_key: string;
      permissions: Partial<PageAccessEntity>;
    }>,
  ): Promise<PageAccessEntity[]> {
    await this.assertCanManagePageAccess(userId, tenantId, roleId);
    const results: PageAccessEntity[] = [];

    for (const item of accessList) {
      const access = await this.setPageAccess(
        roleId,
        tenantId,
        userId,
        item.page_key,
        item.permissions,
      );
      results.push(access);
    }

    return results;
  }

  private async getPlanAllowedPageKeys(tenantId: string) {
    const subscription =
      await this.subscriptionsService.getCurrentSubscriptionForTenant(tenantId);
    if (!subscription) {
      return new Set<string>();
    }
    const enabledFeatures = new Set(subscription.plan.features);

    return new Set(
      DEFAULT_PAGES.filter(
        (page) =>
          !page.requiredFeature || enabledFeatures.has(page.requiredFeature),
      ).map((page) => page.key),
    );
  }

  private sanitizePermissions(
    permissions: Partial<PageAccessEntity>,
    planIncluded: boolean,
  ) {
    if (planIncluded) {
      return permissions;
    }

    return {
      ...permissions,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
    };
  }

  private async assertCanManagePageAccess(
    userId: string,
    tenantId: string,
    roleId: string,
  ) {
    // Only superadmin (or system admin) can manage page access rules
    const canManage = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);
    if (!canManage) {
      throw new ForbiddenException('Only super admin can manage page access');
    }

    const targetRole = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }
  }

  private normalizeRoleName(name: string) {
    return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  }
}
