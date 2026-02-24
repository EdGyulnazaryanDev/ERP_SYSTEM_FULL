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
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('role-permissions')
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolePermissionsService.findAll(tenantId);
  }

  @Get('role/:roleId')
  findByRole(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.findByRole(roleId, tenantId);
  }

  @Get('permission/:permissionId')
  findByPermission(
    @Param('permissionId') permissionId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.findByPermission(
      permissionId,
      tenantId,
    );
  }

  @Post('role/:roleId/permission')
  assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionToRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.assignPermissionToRole(
      roleId,
      dto.permissionId,
      tenantId,
    );
  }

  @Delete('role/:roleId/permission/:permissionId')
  removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.removePermissionFromRole(
      roleId,
      permissionId,
      tenantId,
    );
  }

  @Delete('role/:roleId')
  removeAllPermissionsFromRole(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolePermissionsService.removeAllPermissionsFromRole(
      roleId,
      tenantId,
    );
  }
}
