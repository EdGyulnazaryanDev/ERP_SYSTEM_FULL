import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import type { JwtUser } from '../../../types/express';
import { AuthService } from '../services/auth.service';

@Controller('test-auth')
export class TestAuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('public')
  getPublic() {
    return { message: 'This is public', timestamp: new Date().toISOString() };
  }

  @Post('quick-login')
  async quickLogin() {
    // For testing purposes - login with first available user
    return this.authService.quickTestLogin();
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
