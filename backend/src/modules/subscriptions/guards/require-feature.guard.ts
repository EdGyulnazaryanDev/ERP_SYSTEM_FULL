import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { RequestWithTenantInterface } from '../../../common/types/request-with-tenant.interface';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../../roles/user-role.entity';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { PlanFeature } from '../subscription.constants';
import { SubscriptionsService } from '../subscriptions.service';

function normalizeRoleName(name: string) {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

@Injectable()
export class RequireFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredFeatures = this.reflector.getAllAndOverride<PlanFeature[]>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithTenantInterface>();

    if (!request.user) {
      throw new ForbiddenException('User not authenticated');
    }

    const tenantId = request.tenantId ?? request.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant context is missing');
    }

    if (request.user.isSystemAdmin || await this.hasPrivilegedRole(request.user.sub, tenantId)) {
      return true;
    }

    for (const feature of requiredFeatures) {
      await this.subscriptionsService.assertFeatureAccess(tenantId, feature);
    }

    return true;
  }

  private async hasPrivilegedRole(userId: string, tenantId: string) {
    const userRoleRepository = this.dataSource.getRepository(UserRole);
    const roleRepository = this.dataSource.getRepository(Role);

    const userRoles = await userRoleRepository.find({
      where: { user_id: userId },
    });

    if (userRoles.length === 0) {
      return false;
    }

    const roles = await roleRepository.find({
      where: userRoles.map((userRole) => ({
        id: userRole.role_id,
        tenant_id: tenantId,
      })),
    });

    return roles.some((role) => normalizeRoleName(role.name) === 'superadmin');
  }
}
