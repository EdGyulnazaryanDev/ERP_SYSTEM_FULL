import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { CheckPageAccess } from '../../common/decorators/check-page-access.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard, PageAccessGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ─── Roles ────────────────────────────────────────────────────────────────

  @Get('roles')
  @CheckPageAccess('rbac', 'view')
  getRoles(@CurrentTenant() tenantId: string) {
    return this.rbacService.getRoles(tenantId);
  }

  // Role CRUD — superadmin only
  @Post('roles')
  @UseGuards(TenantSuperAdminGuard)
  createRole(
    @Body() body: { name: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.createRole(body.name, body.description, tenantId);
  }

  @Put('roles/:id')
  @UseGuards(TenantSuperAdminGuard)
  updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.updateRole(id, body, tenantId);
  }

  @Delete('roles/:id')
  @UseGuards(TenantSuperAdminGuard)
  deleteRole(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rbacService.deleteRole(id, tenantId);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  @Get('permissions')
  @CheckPageAccess('rbac', 'view')
  getPermissions(@CurrentTenant() tenantId: string) {
    return this.rbacService.getPermissions(tenantId);
  }

  // Permission CRUD — superadmin only
  @Post('permissions')
  @UseGuards(TenantSuperAdminGuard)
  createPermission(
    @Body() body: { name: string; resource: string; action: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.createPermission(body, tenantId);
  }

  @Put('permissions/:id')
  @UseGuards(TenantSuperAdminGuard)
  updatePermission(
    @Param('id') id: string,
    @Body() body: { name?: string; resource?: string; action?: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.updatePermission(id, body, tenantId);
  }

  @Delete('permissions/:id')
  @UseGuards(TenantSuperAdminGuard)
  deletePermission(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rbacService.deletePermission(id, tenantId);
  }

  // ─── Role-Permission Assignment ───────────────────────────────────────────

  @Get('roles/:roleId/permissions')
  @CheckPageAccess('rbac', 'view')
  getRolePermissions(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.getRolePermissions(roleId, tenantId);
  }

  // Assigning permissions to roles — superadmin only
  @Post('roles/:roleId/permissions')
  @UseGuards(TenantSuperAdminGuard)
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.assignPermissions(roleId, body.permissionIds, tenantId);
  }
}
