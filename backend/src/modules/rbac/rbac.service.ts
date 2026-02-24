import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermission } from '../permissions/role-permission.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepo: Repository<RolePermission>,
  ) {}

  // Roles
  async getRoles(tenantId: string) {
    return this.roleRepo.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async createRole(name: string, description: string | undefined, tenantId: string) {
    const role = this.roleRepo.create({
      name,
      description,
      tenant_id: tenantId,
      is_system: false,
    });
    return this.roleRepo.save(role);
  }

  async updateRole(
    id: string,
    data: { name?: string; description?: string },
    tenantId: string,
  ) {
    const role = await this.roleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role');
    }

    Object.assign(role, data);
    return this.roleRepo.save(role);
  }

  async deleteRole(id: string, tenantId: string) {
    const role = await this.roleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role');
    }

    await this.roleRepo.remove(role);
    return { message: 'Role deleted successfully' };
  }

  // Permissions
  async getPermissions(tenantId: string) {
    return this.permissionRepo.find({
      where: { tenant_id: tenantId },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async createPermission(
    data: {
      name: string;
      resource: string;
      action: string;
      description?: string;
    },
    tenantId: string,
  ) {
    const permission = this.permissionRepo.create({
      ...data,
      tenant_id: tenantId,
    });
    return this.permissionRepo.save(permission);
  }

  async updatePermission(
    id: string,
    data: {
      name?: string;
      resource?: string;
      action?: string;
      description?: string;
    },
    tenantId: string,
  ) {
    const permission = await this.permissionRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    Object.assign(permission, data);
    return this.permissionRepo.save(permission);
  }

  async deletePermission(id: string, tenantId: string) {
    const permission = await this.permissionRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionRepo.remove(permission);
    return { message: 'Permission deleted successfully' };
  }

  // Role-Permission Assignment
  async getRolePermissions(roleId: string, tenantId: string) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rolePermissions = await this.rolePermissionRepo.find({
      where: { role_id: roleId },
      relations: ['permission'],
    });

    return rolePermissions
      .map((rp) => rp.permission)
      .filter((p) => p.tenant_id === tenantId);
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
    tenantId: string,
  ) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    // Remove existing permissions
    await this.rolePermissionRepo.delete({ role_id: roleId });

    // Add new permissions
    if (permissionIds.length > 0) {
      const permissions = await this.permissionRepo.find({
        where: permissionIds.map((id) => ({ id, tenant_id: tenantId })),
      });

      const rolePermissions = permissions.map((permission) =>
        this.rolePermissionRepo.create({
          role_id: roleId,
          permission_id: permission.id,
        }),
      );

      await this.rolePermissionRepo.save(rolePermissions);
    }

    return { message: 'Permissions assigned successfully' };
  }
}
