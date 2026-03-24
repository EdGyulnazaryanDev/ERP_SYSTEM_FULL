import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { CheckPageAccess } from '../../common/decorators/check-page-access.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard, PageAccessGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // Read — anyone with rbac view access
  @Get()
  @CheckPageAccess('rbac', 'view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.permissionsService.findAll(tenantId);
  }

  @Get(':id')
  @CheckPageAccess('rbac', 'view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.permissionsService.findOne(id, tenantId);
  }

  @Get('roles/:roleId')
  @CheckPageAccess('rbac', 'view')
  getRolePermissions(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getRolePermissions(roleId, tenantId);
  }

  @Get('users/:userId')
  @CheckPageAccess('rbac', 'view')
  getUserPermissions(
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getUserPermissions(userId, tenantId);
  }

  // Write — superadmin only
  @Post()
  @UseGuards(TenantSuperAdminGuard)
  create(@Body() createDto: CreatePermissionDto, @CurrentTenant() tenantId: string) {
    return this.permissionsService.create(createDto, tenantId);
  }

  @Patch(':id')
  @UseGuards(TenantSuperAdminGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.update(id, updateDto, tenantId);
  }

  @Delete(':id')
  @UseGuards(TenantSuperAdminGuard)
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.permissionsService.remove(id, tenantId);
  }

  @Post('roles/:roleId/assign')
  @UseGuards(TenantSuperAdminGuard)
  assignToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.assignToRole(roleId, dto.permissionIds, tenantId);
  }
}
