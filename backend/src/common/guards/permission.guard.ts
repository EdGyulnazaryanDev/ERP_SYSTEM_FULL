import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../modules/permissions/permissions.service';
import {
  PERMISSION_KEY,
  PermissionRequirement,
} from '../decorators/require-permission.decorator';
import type { RequestWithTenantInterface } from '../types/request-with-tenant.interface';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<
      PermissionRequirement
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithTenantInterface>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const tenantId = request.tenantId ?? user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    const hasPermission = await this.permissionsService.checkUserPermission(
      user.sub,
      requiredPermission.resource,
      requiredPermission.action,
      tenantId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermission.resource}:${requiredPermission.action}`,
      );
    }

    return true;
  }
}
