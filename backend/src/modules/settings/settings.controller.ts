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
  getPageCatalog() {
    return this.settingsService.getPageCatalog();
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
    @CurrentTenant() tenantId: string,
  ) {
    return this.settingsService.getPageAccessMatrixForRole(roleId, tenantId);
  }

  @Get('page-access/me')
  async getMyPageAccess(
    @CurrentUser() user: JwtUser,
    @CurrentTenant() tenantId: string,
  ) {
    // Fetch user's roles from the service
    return this.settingsService.getPageAccessForUserById(user.sub, tenantId);
  }

  @Post('page-access/role/:roleId')
  setPageAccess(
    @Param('roleId') roleId: string,
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
      body.page_key,
      body.permissions,
    );
  }

  @Post('page-access/role/:roleId/bulk')
  bulkSetPageAccess(
    @Param('roleId') roleId: string,
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
      body.accessList,
    );
  }

  @Post('page-access/role/:roleId/initialize')
  initializeDefaultAccess(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
    @Body() body: { isAdmin?: boolean },
  ) {
    return this.settingsService.initializeDefaultAccess(
      roleId,
      tenantId,
      body.isAdmin,
    );
  }
}
