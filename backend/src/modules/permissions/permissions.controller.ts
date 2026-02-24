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
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  create(
    @Body() createDto: CreatePermissionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.create(createDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.permissionsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.permissionsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.update(id, updateDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.permissionsService.remove(id, tenantId);
  }

  @Post('roles/:roleId/assign')
  assignToRole(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.assignToRole(
      roleId,
      dto.permissionIds,
      tenantId,
    );
  }

  @Get('roles/:roleId')
  getRolePermissions(
    @Param('roleId') roleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getRolePermissions(roleId, tenantId);
  }

  @Get('users/:userId')
  getUserPermissions(
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getUserPermissions(userId, tenantId);
  }
}
