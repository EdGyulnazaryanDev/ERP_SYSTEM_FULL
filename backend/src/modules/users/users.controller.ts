import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { CheckPageAccess } from '../../common/decorators/check-page-access.decorator';
import { UsersService } from './users.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, PageAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @CheckPageAccess('users', 'create')
  create(@Body() createDto: any, @CurrentTenant() tenantId: string) {
    if (!createDto.email) throw new BadRequestException('Email is required');
    const { role_id, ...userDto } = createDto;
    return this.usersService.create(userDto, tenantId);
  }

  @Get()
  @CheckPageAccess('users', 'view')
  findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('search') search?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.usersService.findAllPaginated(tenantId, parseInt(page, 10), parseInt(pageSize, 10), search);
  }

  @Get(':id')
  @CheckPageAccess('users', 'view')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @CheckPageAccess('users', 'edit')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.update(id, updateDto, tenantId);
  }

  @Delete(':id')
  @CheckPageAccess('users', 'delete')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }

  @Post('bulk-delete')
  @CheckPageAccess('users', 'delete')
  bulkDelete(@Body('ids') ids: string[], @CurrentTenant() tenantId: string) {
    return this.usersService.bulkDelete(ids, tenantId);
  }

  // Profile and password — users can always manage their own account
  @Patch('profile/update')
  updateProfile(
    @Body() updateDto: UpdateUserDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.updateProfile(updateDto, tenantId);
  }

  @Post('change-password')
  changePassword(
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.changePassword(oldPassword, newPassword, tenantId);
  }

  @Patch(':id/set-password')
  @CheckPageAccess('users', 'edit')
  setPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @CurrentTenant() tenantId: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    return this.usersService.setPasswordByAdmin(id, newPassword, tenantId);
  }
}
