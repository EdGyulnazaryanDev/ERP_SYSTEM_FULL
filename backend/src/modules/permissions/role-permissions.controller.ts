import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { AssignPermissionToRoleDto } from './dto/assign-permission-to-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { CheckPageAccess } from '../../common/decorators/check-page-access.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard, PageAccessGuard)
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  // Read — anyone with rbac view access
  @Get()
  @CheckPageAccess('rbac', 'view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolePermissionsService.findAll(tenantId);
  }

  @Get('role/:roleId')
  @CheckPageAccess('rbac', 'view')
  findByRole(@Param('roleId') roleId: string, @CurrentTenant() tenantId: string) {
    return this.rolePermissionsService.findByRole(roleId, tenantId);
  }

  @Get('permission/:permissionId')
  @CheckPageAccess('rbac', 'view')
  findByPermission(@Param('permissionId') permissionId: string, @CurrentTenant() tenantId: string) {
    return this.rolePermissionsService.findByPermission(permissionId, tenantId);
  }

  // Write — superadmin only
  @Post('role/:roleId/permission')
  @UseGuards(TenantSuperAdminGuard)
  assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionToRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.assignPermissionToRole(roleId, dto.permissionId, tenantId);
  }

  @Delete('role/:roleId/permission/:permissionId')
  @UseGuards(TenantSuperAdminGuard)
  removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.removePermissionFromRole(roleId, permissionId, tenantId);
  }

  @Delete('role/:roleId')
  @UseGuards(TenantSuperAdminGuard)
  removeAllPermissionsFromRole(@Param('roleId') roleId: string, @CurrentTenant() tenantId: string) {
    return this.rolePermissionsService.removeAllPermissionsFromRole(roleId, tenantId);
  }
}
