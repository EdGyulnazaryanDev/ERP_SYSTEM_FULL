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
import { UsersService } from './users.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create user
  @Post()
  create(@Body() createDto: any, @CurrentTenant() tenantId: string) {
    if (!createDto.email) {
      throw new BadRequestException('Email is required');
    }
    // Strip role_id if present - role assignment happens separately
    const { role_id, ...userDto } = createDto;
    return this.usersService.create(userDto, tenantId);
  }

  // Get all users with pagination and search
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('search') search?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.usersService.findAllPaginated(
      tenantId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      search,
    );
  }

  // Get single user
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  // Update user
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.update(id, updateDto, tenantId);
  }

  // Delete user
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }

  // Bulk delete users
  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[], @CurrentTenant() tenantId: string) {
    return this.usersService.bulkDelete(ids, tenantId);
  }

  // Update user profile
  @Patch('profile/update')
  updateProfile(
    @Body() updateDto: UpdateUserDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.updateProfile(updateDto, tenantId);
  }

  // Change password
  @Post('change-password')
  changePassword(
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.usersService.changePassword(oldPassword, newPassword, tenantId);
  }
}
