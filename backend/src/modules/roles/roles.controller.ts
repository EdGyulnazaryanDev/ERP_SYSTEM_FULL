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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignUsersDto } from './dto/assign-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { CheckPageAccess } from '../../common/decorators/check-page-access.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard, PageAccessGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Reading roles is allowed for anyone with rbac view access
  @Get()
  @CheckPageAccess('rbac', 'view')
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  @CheckPageAccess('rbac', 'view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  // Role CRUD — superadmin only (these are structural, not page-access controlled)
  @Post()
  @UseGuards(TenantSuperAdminGuard)
  create(@Body() createDto: CreateRoleDto, @CurrentTenant() tenantId: string) {
    return this.rolesService.create(createDto, tenantId);
  }

  @Patch(':id')
  @UseGuards(TenantSuperAdminGuard)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.update(id, updateDto, tenantId);
  }

  @Delete(':id')
  @UseGuards(TenantSuperAdminGuard)
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.remove(id, tenantId);
  }

  // Role-user assignment — requires rbac edit access
  @Post(':id/users')
  @CheckPageAccess('rbac', 'edit')
  assignUsers(
    @Param('id') id: string,
    @Body() dto: AssignUsersDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.assignUsers(id, dto.userIds, tenantId);
  }

  @Get(':id/users')
  @CheckPageAccess('rbac', 'view')
  getRoleUsers(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.getRoleUsers(id, tenantId);
  }

  // Any authenticated user can read their own roles (no page access check needed)
  @Get('users/:userId')
  getUserRoles(
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.getUserRoles(userId, tenantId);
  }

  @Post(':roleId/users/:userId')
  @CheckPageAccess('rbac', 'edit')
  assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.assignRoleToUser(userId, roleId, tenantId);
  }

  @Delete(':roleId/users/:userId')
  @CheckPageAccess('rbac', 'edit')
  removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId, tenantId);
  }
}
