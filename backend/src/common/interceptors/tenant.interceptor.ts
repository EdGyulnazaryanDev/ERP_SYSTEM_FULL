import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
  ];

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.url;

    // Skip tenant validation for public routes
    if (this.publicRoutes.some(route => path.includes(route))) {
      return next.handle();
    }

    // Skip if no user (route is not protected by JWT guard)
    if (!request.user) {
      return next.handle();
    }

    if (!request.user?.tenantId) {
      throw new ForbiddenException('Tenant not found in token');
    }

    request.tenantId = request.user.tenantId;

    return next.handle();
  }
}
