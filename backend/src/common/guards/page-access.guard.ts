import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageAccessEntity } from '../../modules/settings/entities/page-access.entity';
import { UserRole } from '../../modules/roles/user-role.entity';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import {
  PAGE_ACCESS_KEY,
  PageAccessRequirement,
} from '../decorators/check-page-access.decorator';
import type { RequestWithTenantInterface } from '../types/request-with-tenant.interface';

@Injectable()
export class PageAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(PageAccessEntity)
    private readonly pageAccessRepo: Repository<PageAccessEntity>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PageAccessRequirement>(
      PAGE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No page access requirement set — allow through
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<RequestWithTenantInterface>();
    const user = request.user;

    if (!user) throw new ForbiddenException('User not authenticated');

    // System admin bypasses everything
    if (user.isSystemAdmin) return true;

    const tenantId = request.tenantId ?? user.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is missing');

    // Superadmin bypasses everything
    const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(user.sub, tenantId);
    if (isSuperAdmin) return true;

    // Get user's roles
    const userRoles = await this.userRoleRepo.find({ where: { user_id: user.sub } });
    if (userRoles.length === 0) {
      throw new ForbiddenException(`No roles assigned — access denied to ${requirement.pageKey}`);
    }

    const roleIds = userRoles.map((ur) => ur.role_id);

    // Find page access rows for this user's roles + page
    const accessRows = await this.pageAccessRepo.find({
      where: roleIds.map((roleId) => ({
        role_id: roleId,
        tenant_id: tenantId,
        page_key: requirement.pageKey,
      })),
    });

    if (accessRows.length === 0) {
      throw new ForbiddenException(`No page access configured for "${requirement.pageKey}"`);
    }

    // OR-merge across roles: if any role grants the action, allow it
    const actionField = `can_${requirement.action}` as keyof PageAccessEntity;
    const hasAccess = accessRows.some((row) => row[actionField] === true);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Permission denied: "${requirement.action}" on "${requirement.pageKey}"`,
      );
    }

    return true;
  }
}
