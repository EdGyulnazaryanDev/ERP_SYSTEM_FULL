import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../types/express';
import { RefreshDto } from '../dto/refresh.dto';
import { ActivatePortalAccountDto } from '../dto/activate-portal-account.dto';
import { SetPortalCredentialsDto } from '../dto/set-portal-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: JwtUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-summary')
  getPortalSummary(@CurrentUser() user: JwtUser) {
    return this.authService.getPortalSummary(user);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('activate')
  activatePortalAccount(@Body() dto: ActivatePortalAccountDto) {
    return this.authService.activatePortalAccount(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal-accounts')
  setPortalCredentials(@CurrentUser() user: JwtUser, @Body() dto: SetPortalCredentialsDto) {
    return this.authService.setPortalCredentials(dto, user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtUser) {
    return this.authService.logout(user.sub, user.tenantId);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
