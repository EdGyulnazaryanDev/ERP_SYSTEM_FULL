import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithTenantInterface } from '../types/request-with-tenant.interface';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithTenantInterface>();
    const tenantId = request.tenantId ?? request.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Missing tenant context');
    }
    return tenantId;
  },
);
