import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { PageAccessEntity } from './entities/page-access.entity';
import type { JwtUser } from '../../types/express';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('page-access/catalog')
  getPageCatalog(
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.settingsService.getPageCatalog(tenantId, user.sub, user.role);
  }

  @Get('page-access/role/:roleId')
  getPageAccessForRole(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.settingsService.getPageAccessForRole(roleId, tenantId);
  }

  @Get('page-access/role/:roleId/matrix')
  getPageAccessMatrixForRole(
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.settingsService.getPageAccessMatrixForRole(
      roleId,
      tenantId,
      user.sub,
      user.role,
    );
  }

  @Get('page-access/me')
  async getMyPageAccess(
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
  ) {
    return this.settingsService.getPageAccessForUserById(user.sub, tenantId, user.role);
  }

  @Post('page-access/role/:roleId')
  setPageAccess(
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      page_key: string;
      permissions: Partial<PageAccessEntity>;
    },
  ) {
    return this.settingsService.setPageAccess(
      roleId,
      tenantId,
      user.sub,
      body.page_key,
      body.permissions,
      user.role,
    );
  }

  @Post('page-access/role/:roleId/bulk')
  bulkSetPageAccess(
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      accessList: Array<{
        page_key: string;
        permissions: Partial<PageAccessEntity>;
      }>;
    },
  ) {
    return this.settingsService.bulkSetPageAccess(
      roleId,
      tenantId,
      user.sub,
      body.accessList,
      user.role,
    );
  }

  @Post('page-access/role/:roleId/initialize')
  initializeDefaultAccess(
    @Param('roleId') roleId: string,
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
    @Body() body: { isAdmin?: boolean },
  ) {
    return this.settingsService.initializeDefaultAccess(
      roleId,
      tenantId,
      user.sub,
      body.isAdmin,
      user.role,
    );
  }
}
