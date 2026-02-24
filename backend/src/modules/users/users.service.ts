import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { BaseTenantService } from '../../common/base/base-tenant.service';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedResponse } from './types';

@Injectable()
export class UsersService extends BaseTenantService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  // Create user
  async create(createDto: CreateUserDto, tenantId: string): Promise<User> {
    // Check if user with email already exists
    const existing = await this.userRepository.findOne({
      where: { email: createDto.email, tenantId },
    });

    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...createDto,
      tenantId,
      is_active: createDto.is_active !== false,
    });

    // Hash password if provided
    if (createDto.password) {
      user.password = await bcrypt.hash(createDto.password, 10);
    }

    return this.userRepository.save(user);
  }

  // Get all users with pagination and search
  async findAllPaginated(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<User>> {
    const where: any = { tenantId };

    if (search) {
      where.email = Like(`%${search}%`);
      // Also search by name
      // This requires a more complex query with OR conditions
    }

    const [data, total] = await this.userRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    // If search includes spaces, also try searching by name
    if (search && search.includes(' ')) {
      const [nameData, nameTotal] = await this.userRepository.findAndCount({
        where: { tenantId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { created_at: 'DESC' },
      });

      const filtered = nameData.filter(
        (u) =>
          u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      );

      return {
        data: filtered,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    }

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get single user
  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Get all users for tenant (simple, no pagination)
  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId },
      order: { created_at: 'DESC' },
    });
  }

  // Update user
  async update(
    id: string,
    updateDto: UpdateUserDto,
    tenantId: string,
  ): Promise<User> {
    const user = await this.findOne(id, tenantId);

    // Check if new email is already taken
    if (updateDto.email && updateDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateDto.email, tenantId },
      });

      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Hash new password if provided
    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }

    await this.userRepository.update(id, updateDto);
    return this.findOne(id, tenantId);
  }

  // Delete user
  async remove(id: string, tenantId: string): Promise<{ success: boolean }> {
    const user = await this.findOne(id, tenantId);
    await this.userRepository.remove(user);
    return { success: true };
  }

  // Bulk delete users
  async bulkDelete(
    ids: string[],
    tenantId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.userRepository.delete({
      id: ids as any,
      tenantId,
    });

    return { deleted: result.affected || 0 };
  }

  // Update user profile (used for current user)
  async updateProfile(
    updateDto: UpdateUserDto,
    tenantId: string,
  ): Promise<User> {
    // This would typically be called with the current user ID from auth context
    // For now, just update the first user with the tenant
    const user = await this.userRepository.findOne({ where: { tenantId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }

    await this.userRepository.update(user.id, updateDto);
    return this.findOne(user.id, tenantId);
  }

  // Change password
  async changePassword(
    oldPassword: string,
    newPassword: string,
    tenantId: string,
  ): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { tenantId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      throw new BadRequestException('Invalid current password');
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(user.id, { password: hashedPassword });

    return { success: true };
  }
}
