import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageAccessEntity } from './entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { Role } from '../roles/role.entity';
import { PlanFeature } from '../subscriptions/subscription.constants';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

const TTL_PAGE_ACCESS = 120;  // 2 min
const TTL_PAGE_CATALOG = 300; // 5 min

export const DEFAULT_PAGES = [
  { key: 'dashboard', name: 'Dashboard', path: '/', category: 'Core', requiredFeature: PlanFeature.DASHBOARD },
  { key: 'products', name: 'Products & Services', path: '/products', category: 'Operations', requiredFeature: PlanFeature.PRODUCTS },
  { key: 'suppliers', name: 'Suppliers', path: '/suppliers', category: 'Operations', requiredFeature: PlanFeature.SUPPLIERS },
  { key: 'categories', name: 'Categories', path: '/categories', category: 'Operations', requiredFeature: PlanFeature.CATEGORIES },
  { key: 'inventory', name: 'Inventory', path: '/inventory', category: 'Operations', requiredFeature: PlanFeature.INVENTORY },
  { key: 'transactions', name: 'Transactions', path: '/transactions', category: 'Operations', requiredFeature: PlanFeature.TRANSACTIONS },
  { key: 'accounting', name: 'Accounting', path: '/accounting', category: 'Finance', requiredFeature: PlanFeature.ACCOUNTING },
  { key: 'payments', name: 'Payments', path: '/payments', category: 'Finance', requiredFeature: PlanFeature.PAYMENTS },
  { key: 'crm', name: 'CRM', path: '/crm', category: 'Sales', requiredFeature: PlanFeature.CRM },
  { key: 'hr', name: 'Human Resources', path: '/hr', category: 'People', requiredFeature: PlanFeature.HR },
  { key: 'procurement', name: 'Procurement', path: '/procurement', category: 'Operations', requiredFeature: PlanFeature.PROCUREMENT },
  { key: 'warehouse', name: 'Warehouse', path: '/warehouse', category: 'Operations', requiredFeature: PlanFeature.WAREHOUSE },
  { key: 'transportation', name: 'Transportation', path: '/transportation', category: 'Logistics', requiredFeature: PlanFeature.TRANSPORTATION },
  { key: 'projects', name: 'Projects', path: '/projects', category: 'Execution', requiredFeature: PlanFeature.PROJECTS },
  { key: 'manufacturing', name: 'Manufacturing', path: '/manufacturing', category: 'Operations', requiredFeature: PlanFeature.MANUFACTURING },
  { key: 'equipment', name: 'Assets', path: '/equipment', category: 'Operations', requiredFeature: PlanFeature.EQUIPMENT },
  { key: 'services', name: 'Services', path: '/services', category: 'Operations', requiredFeature: PlanFeature.SERVICES },
  { key: 'communication', name: 'Communication', path: '/communication', category: 'Collaboration', requiredFeature: PlanFeature.COMMUNICATION },
  { key: 'compliance', name: 'Compliance', path: '/compliance', category: 'Governance', requiredFeature: PlanFeature.COMPLIANCE },
  { key: 'bi', name: 'BI & Reports', path: '/bi', category: 'Analytics', requiredFeature: PlanFeature.REPORTS },
  { key: 'users', name: 'Users', path: '/users', category: 'Administration', requiredFeature: PlanFeature.USERS },
  { key: 'modules', name: 'Modules', path: '/modules', category: 'Administration' },
  { key: 'rbac', name: 'RBAC', path: '/rbac', category: 'Administration', requiredFeature: PlanFeature.RBAC },
  { key: 'settings', name: 'Settings', path: '/settings', category: 'Administration', requiredFeature: PlanFeature.SETTINGS },
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
    private readonly redis: RedisService,
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
    jwtRole?: string,
  ): Promise<any> {
    const cacheKey = `page_access:${tenantId}:${userId}`;
    return this.redis.cached(cacheKey, TTL_PAGE_ACCESS, async () => {
      const normalizedJwt = jwtRole?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';
      const isJwtPrivileged = normalizedJwt === 'admin' || normalizedJwt === 'superadmin';
      const isSysAdmin = isJwtPrivileged
        || await this.subscriptionsService.isAdminOrSuperAdminUser(userId, tenantId);

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

      const userRoles = await this.userRoleRepo.find({ where: { user_id: userId } });
      if (userRoles.length === 0) return [];

      const roleIds = userRoles.map((ur) => ur.role_id);
      for (const roleId of roleIds) {
        const existingCount = await this.pageAccessRepo.count({
          where: { role_id: roleId, tenant_id: tenantId },
        });
        if (existingCount === 0) {
          await this.initializeDefaultAccess(roleId, tenantId, false);
        }
      }

      return this.getPageAccessForUser(roleIds, tenantId, { bypassSubscription: false });
    });
  }

  async getPageCatalog(tenantId: string, userId: string, jwtRole?: string) {
    const cacheKey = `page_catalog:${tenantId}:${userId}`;
    return this.redis.cached(cacheKey, TTL_PAGE_CATALOG, async () => {
      const normalizedJwt = jwtRole?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';
      const isPrivileged = normalizedJwt === 'admin' || normalizedJwt === 'superadmin'
        || await this.subscriptionsService.isAdminOrSuperAdminUser(userId, tenantId);
      const allowedPageKeys = isPrivileged
        ? new Set(DEFAULT_PAGES.map((page) => page.key))
        : await this.getPlanAllowedPageKeys(tenantId);
      return DEFAULT_PAGES.filter((page) => allowedPageKeys.has(page.key));
    });
  }

  async getPageAccessMatrixForRole(
    roleId: string,
    tenantId: string,
    userId: string,
    jwtRole?: string,
  ) {
    await this.assertCanManagePageAccess(userId, tenantId, roleId, jwtRole);
    
    // Auto-initialize if no rows exist yet for this role
    const existingCount = await this.pageAccessRepo.count({
      where: { role_id: roleId, tenant_id: tenantId },
    });
    if (existingCount === 0) {
      await this.initializeDefaultAccess(roleId, tenantId, false);
    }

    const accessList = await this.getPageAccessForRole(roleId, tenantId);
    const accessMap = new Map(accessList.map((access) => [access.page_key, access]));

    // Always filter by actual subscription plan — admin privilege doesn't bypass plan limits
    const allowedPageKeys = await this.getPlanAllowedPageKeys(tenantId);

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
    jwtRole?: string,
  ): Promise<PageAccessEntity> {
    await this.assertCanManagePageAccess(userId, tenantId, roleId, jwtRole);
    let access = await this.pageAccessRepo.findOne({
      where: { role_id: roleId, tenant_id: tenantId, page_key: pageKey },
    });

    const page = DEFAULT_PAGES.find((p) => p.key === pageKey);
    const normalizedJwt = jwtRole?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';
    const isPrivileged = normalizedJwt === 'admin' || normalizedJwt === 'superadmin'
      || await this.subscriptionsService.isAdminOrSuperAdminUser(userId, tenantId);
    const allowedPageKeys = isPrivileged
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

    const saved = await this.pageAccessRepo.save(access);
    // Invalidate all page-access caches for this tenant
    await this.redis.delPattern(`page_access:${tenantId}:*`);
    await this.redis.delPattern(`page_catalog:${tenantId}:*`);
    return saved;
  }

  async initializeDefaultAccess(
    roleId: string,
    tenantId: string,
    userIdOrIsAdmin: string | boolean,
    isAdmin = false,
    jwtRole?: string,
  ): Promise<void> {
    const userId =
      typeof userIdOrIsAdmin === 'string' ? userIdOrIsAdmin : undefined;
    const effectiveIsAdmin =
      typeof userIdOrIsAdmin === 'boolean' ? userIdOrIsAdmin : isAdmin;

    if (userId) {
      await this.assertCanManagePageAccess(userId, tenantId, roleId, jwtRole);
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
    jwtRole?: string,
  ): Promise<PageAccessEntity[]> {
    await this.assertCanManagePageAccess(userId, tenantId, roleId, jwtRole);
    const results: PageAccessEntity[] = [];

    for (const item of accessList) {
      const access = await this.setPageAccess(
        roleId,
        tenantId,
        userId,
        item.page_key,
        item.permissions,
        jwtRole,
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
    jwtRole?: string,
  ) {
    // Fast-path: JWT role claim is admin or superadmin — no DB query needed
    const normalizedJwtRole = jwtRole?.trim().toLowerCase().replace(/[\s_-]+/g, '') ?? '';
    const isJwtPrivileged = normalizedJwtRole === 'admin' || normalizedJwtRole === 'superadmin';

    if (!isJwtPrivileged) {
      const canManage = await this.subscriptionsService.isAdminOrSuperAdminUser(userId, tenantId);
      if (!canManage) {
        throw new ForbiddenException('Only admin can manage page access');
      }
    }

    const targetRole = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!targetRole) {
      throw new NotFoundException('Role not found');
    }

    // Admin (non-superadmin) cannot manage superadmin role permissions
    const isJwtSuperAdmin = normalizedJwtRole === 'superadmin';
    if (!isJwtSuperAdmin) {
      const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(userId, tenantId);
      if (!isSuperAdmin) {
        const targetNormalized = this.normalizeRoleName(targetRole.name);
        if (targetNormalized === 'superadmin') {
          throw new ForbiddenException('Admin cannot modify superadmin role permissions');
        }
      }
    }
  }

  private normalizeRoleName(name: string) {
    return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  }
}
