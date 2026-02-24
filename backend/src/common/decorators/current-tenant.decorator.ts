import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithTenantInterface } from '../types/request-with-tenant.interface';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithTenantInterface>();
    return request.tenantId || request.user?.tenantId;
  },
);
