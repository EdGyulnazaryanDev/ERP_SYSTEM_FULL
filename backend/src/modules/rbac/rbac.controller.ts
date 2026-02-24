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
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Roles
  @Get('roles')
  getRoles(@CurrentTenant() tenantId: string) {
    return this.rbacService.getRoles(tenantId);
  }

  @Post('roles')
  createRole(
    @Body() body: { name: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.createRole(body.name, body.description, tenantId);
  }

  @Put('roles/:id')
  updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.updateRole(id, body, tenantId);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rbacService.deleteRole(id, tenantId);
  }

  // Permissions
  @Get('permissions')
  getPermissions(@CurrentTenant() tenantId: string) {
    return this.rbacService.getPermissions(tenantId);
  }

  @Post('permissions')
  createPermission(
    @Body()
    body: {
      name: string;
      resource: string;
      action: string;
      description?: string;
    },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.createPermission(body, tenantId);
  }

  @Put('permissions/:id')
  updatePermission(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      resource?: string;
      action?: string;
      description?: string;
    },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.updatePermission(id, body, tenantId);
  }

  @Delete('permissions/:id')
  deletePermission(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.deletePermission(id, tenantId);
  }

  // Role-Permission Assignment
  @Get('roles/:roleId/permissions')
  getRolePermissions(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.getRolePermissions(roleId, tenantId);
  }

  @Post('roles/:roleId/permissions')
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
    @CurrentTenant() tenantId: string,
  ) {
    return this.rbacService.assignPermissions(
      roleId,
      body.permissionIds,
      tenantId,
    );
  }
}
