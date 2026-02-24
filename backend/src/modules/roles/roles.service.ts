import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(createDto: CreateRoleDto, tenantId: string): Promise<Role> {
    const role = this.roleRepo.create({
      name: createDto.name,
      description: createDto.description,
      tenant_id: tenantId,
    });

    const savedRole = await this.roleRepo.save(role);

    // Assign permissions if provided
    if (createDto.permissionIds && createDto.permissionIds.length > 0) {
      await this.permissionsService.assignToRole(
        savedRole.id,
        createDto.permissionIds,
        tenantId,
      );
    }

    return savedRole;
  }

  async findAll(tenantId: string): Promise<Role[]> {
    return this.roleRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(
    id: string,
    updateDto: UpdateRoleDto,
    tenantId: string,
  ): Promise<Role> {
    const role = await this.findOne(id, tenantId);

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role');
    }

    if (updateDto.name !== undefined) {
      role.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      role.description = updateDto.description;
    }

    const updatedRole = await this.roleRepo.save(role);

    // Update permissions if provided
    if (updateDto.permissionIds) {
      await this.permissionsService.assignToRole(
        id,
        updateDto.permissionIds,
        tenantId,
      );
    }

    return updatedRole;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const role = await this.findOne(id, tenantId);

    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role');
    }

    // Check if role has users
    const userCount = await this.userRoleRepo.count({
      where: { role_id: id },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${userCount} assigned users`,
      );
    }

    await this.roleRepo.remove(role);
  }

  async assignUsers(
    roleId: string,
    userIds: string[],
    tenantId: string,
  ): Promise<void> {
    await this.findOne(roleId, tenantId);

    // Remove existing assignments for these users
    await this.userRoleRepo.delete({
      user_id: userIds.length > 0 ? userIds[0] : undefined,
    });

    // Create new assignments
    const userRoles = userIds.map((userId) =>
      this.userRoleRepo.create({
        user_id: userId,
        role_id: roleId,
      }),
    );

    await this.userRoleRepo.save(userRoles);
  }

  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const query = `
      SELECT r.*
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.tenant_id = $2
      ORDER BY r.name
    `;

    return this.roleRepo.query(query, [userId, tenantId]);
  }

  async getRoleUsers(roleId: string, tenantId: string): Promise<any[]> {
    await this.findOne(roleId, tenantId);

    const query = `
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1 AND u.tenant_id = $2
      ORDER BY u.email
    `;

    return this.roleRepo.query(query, [roleId, tenantId]);
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    await this.findOne(roleId, tenantId);

    const existing = await this.userRoleRepo.findOne({
      where: { user_id: userId, role_id: roleId },
    });

    if (existing) {
      return;
    }

    const userRole = this.userRoleRepo.create({
      user_id: userId,
      role_id: roleId,
    });

    await this.userRoleRepo.save(userRole);
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    await this.findOne(roleId, tenantId);

    await this.userRoleRepo.delete({
      user_id: userId,
      role_id: roleId,
    });
  }
}
