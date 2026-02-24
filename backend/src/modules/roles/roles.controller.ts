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
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(
    @Body() createDto: CreateRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.create(createDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.update(id, updateDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.remove(id, tenantId);
  }

  @Post(':id/users')
  assignUsers(
    @Param('id') id: string,
    @Body() dto: AssignUsersDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.assignUsers(id, dto.userIds, tenantId);
  }

  @Get(':id/users')
  getRoleUsers(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.rolesService.getRoleUsers(id, tenantId);
  }

  @Get('users/:userId')
  getUserRoles(
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.getUserRoles(userId, tenantId);
  }

  @Post(':roleId/users/:userId')
  assignRoleToUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.assignRoleToUser(userId, roleId, tenantId);
  }

  @Delete(':roleId/users/:userId')
  removeRoleFromUser(
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.rolesService.removeRoleFromUser(userId, roleId, tenantId);
  }
}
