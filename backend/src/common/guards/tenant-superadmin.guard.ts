import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import type { RequestWithTenantInterface } from '../types/request-with-tenant.interface';

/**
 * Requires the user to be a tenant-level superadmin (or global system admin).
 * Use this guard on endpoints that ONLY superadmins can access (role/permission management, plan selection).
 */
@Injectable()
export class TenantSuperAdminGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenantInterface>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.isSystemAdmin) return true;

    const tenantId = request.tenantId ?? user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is missing');
    }

    const isSuperAdmin = await this.subscriptionsService.isSuperAdminUser(user.sub, tenantId);
    if (!isSuperAdmin) {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
