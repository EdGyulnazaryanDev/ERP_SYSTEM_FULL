import { Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import type { JwtUser } from '../../../types/express';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Controller('test-auth')
export class TestAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('public')
  getPublic() {
    return { message: 'This is public', timestamp: new Date().toISOString() };
  }

  @Post('quick-login')
  async quickLogin(@Req() req: Request) {
    const clientIp = this.extractClientIp(req);
    const allowedIps = this.getAllowedIps();

    if (!this.isClientAllowed(clientIp, allowedIps)) {
      throw new ForbiddenException(
        `Quick login is restricted to ${allowedIps.join(', ')}; your IP is ${clientIp}`,
      );
    }

    // For testing purposes - login with first available user
    return this.authService.quickTestLogin();
  }

  private getAllowedIps() {
    const raw = this.configService.get<string>('QUICK_LOGIN_ALLOWED_IPS');
    const defaults = ['127.0.0.1', '::1'];
    if (!raw) return defaults;
    const parsed = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : defaults;
  }

  private extractClientIp(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[0];
      }
    }
    return req.ip ?? '';
  }

  private normalizeIp(value?: string) {
    if (!value) return '';
    return value.replace(/^::ffff:/, '');
  }

  private isClientAllowed(clientIp: string, allowedIps: string[]) {
    const normalizedClient = this.normalizeIp(clientIp);
    return allowedIps.some((ip) => this.normalizeIp(ip) === normalizedClient);
  }

  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
  ) {
    return {
      message: 'This is protected',
      user: {
        id: user.sub,
        email: user.email,
        tenantId: user.tenantId,
      },
      extractedTenantId: tenantId,
      timestamp: new Date().toISOString(),
    };
  }
}
