import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RedisService } from '../../infrastructure/redis/redis.service';

const TTL_PERMISSION = 300; // 5 min

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    private readonly redis: RedisService,
  ) {}

  async create(
    createDto: CreatePermissionDto,
    tenantId: string,
  ): Promise<Permission> {
    const permission = this.permissionRepo.create({
      ...createDto,
      tenant_id: tenantId,
    });
    return this.permissionRepo.save(permission);
  }

  async findAll(tenantId: string): Promise<Permission[]> {
    return this.permissionRepo.find({
      where: { tenant_id: tenantId },
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Permission> {
    const permission = await this.permissionRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async update(
    id: string,
    updateDto: UpdatePermissionDto,
    tenantId: string,
  ): Promise<Permission> {
    const permission = await this.findOne(id, tenantId);
    Object.assign(permission, updateDto);
    return this.permissionRepo.save(permission);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const permission = await this.findOne(id, tenantId);
    await this.permissionRepo.remove(permission);
  }

  async assignToRole(
    roleId: string,
    permissionIds: string[],
    tenantId: string,
  ): Promise<void> {
    // Remove existing permissions
    await this.rolePermissionRepo.delete({ role_id: roleId });

    // Verify all permissions belong to tenant
    const permissions = await this.permissionRepo.find({
      where: permissionIds.map((id) => ({ id, tenant_id: tenantId })),
    });

    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('Some permissions not found');
    }

    // Assign new permissions
    const rolePermissions = permissionIds.map((permissionId) =>
      this.rolePermissionRepo.create({
        role_id: roleId,
        permission_id: permissionId,
      }),
    );

    await this.rolePermissionRepo.save(rolePermissions);
    // Invalidate all permission caches for this tenant
    await this.redis.delPattern(`perm:${tenantId}:*`);
  }

  async getRolePermissions(
    roleId: string,
    tenantId: string,
  ): Promise<Permission[]> {
    const rolePermissions = await this.rolePermissionRepo.find({
      where: { role_id: roleId },
      relations: ['permission'],
    });

    return rolePermissions
      .map((rp) => rp.permission)
      .filter((p) => p.tenant_id === tenantId);
  }

  async getUserPermissions(
    userId: string,
    tenantId: string,
  ): Promise<Permission[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      INNER JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1 AND p.tenant_id = $2
      ORDER BY p.resource, p.action
    `;

    return this.permissionRepo.query(query, [userId, tenantId]);
  }

  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
    tenantId: string,
  ): Promise<boolean> {
    const cacheKey = `perm:${tenantId}:${userId}:${resource}:${action}`;
    return this.redis.cached(cacheKey, TTL_PERMISSION, async () => {
      const query = `
        SELECT COUNT(*) as count
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 
          AND p.resource = $2 
          AND p.action = $3 
          AND p.tenant_id = $4
      `;
      const result = await this.permissionRepo.query(query, [userId, resource, action, tenantId]);
      return parseInt(result[0].count) > 0;
    });
  }
}
