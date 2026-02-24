import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { Permission } from './permission.entity';
import { Role } from '../roles/role.entity';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(tenantId: string): Promise<RolePermission[]> {
    const query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name
      FROM role_permissions rp
      INNER JOIN roles r ON rp.role_id = r.id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE r.tenant_id = $1 AND p.tenant_id = $1
      ORDER BY r.name, p.name
    `;

    return this.rolePermissionRepo.query(query, [tenantId]);
  }

  async findByRole(roleId: string, tenantId: string): Promise<Permission[]> {
    // Verify role belongs to tenant
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

  async findByPermission(
    permissionId: string,
    tenantId: string,
  ): Promise<Role[]> {
    // Verify permission belongs to tenant
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const rolePermissions = await this.rolePermissionRepo.find({
      where: { permission_id: permissionId },
      relations: ['role'],
    });

    return rolePermissions
      .map((rp) => rp.role)
      .filter((r) => r.tenant_id === tenantId);
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    tenantId: string,
  ): Promise<RolePermission> {
    // Verify role belongs to tenant
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    // Verify permission belongs to tenant
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check if already assigned
    const existing = await this.rolePermissionRepo.findOne({
      where: { role_id: roleId, permission_id: permissionId },
    });

    if (existing) {
      return existing;
    }

    // Create assignment
    const rolePermission = this.rolePermissionRepo.create({
      role_id: roleId,
      permission_id: permissionId,
    });

    return this.rolePermissionRepo.save(rolePermission);
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    tenantId: string,
  ): Promise<void> {
    // Verify role belongs to tenant
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    // Verify permission belongs to tenant
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.rolePermissionRepo.delete({
      role_id: roleId,
      permission_id: permissionId,
    });
  }

  async removeAllPermissionsFromRole(
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    // Verify role belongs to tenant
    const role = await this.roleRepo.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    await this.rolePermissionRepo.delete({ role_id: roleId });
  }

  async getRolePermissionCount(roleId: string): Promise<number> {
    return this.rolePermissionRepo.count({
      where: { role_id: roleId },
    });
  }

  async getPermissionRoleCount(permissionId: string): Promise<number> {
    return this.rolePermissionRepo.count({
      where: { permission_id: permissionId },
    });
  }
}
