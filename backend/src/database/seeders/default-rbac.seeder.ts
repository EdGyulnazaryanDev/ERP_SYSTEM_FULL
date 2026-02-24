import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';

export interface DefaultPermission {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface DefaultRole {
  name: string;
  description: string;
  is_system: boolean;
  permissions: string[]; // permission names
}

@Injectable()
export class DefaultRbacSeeder {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  private defaultPermissions: DefaultPermission[] = [
    // User Management
    { name: 'View Users', resource: 'users', action: 'read', description: 'Can view users' },
    { name: 'Create Users', resource: 'users', action: 'create', description: 'Can create users' },
    { name: 'Edit Users', resource: 'users', action: 'update', description: 'Can edit users' },
    { name: 'Delete Users', resource: 'users', action: 'delete', description: 'Can delete users' },

    // Role Management
    { name: 'View Roles', resource: 'roles', action: 'read', description: 'Can view roles' },
    { name: 'Create Roles', resource: 'roles', action: 'create', description: 'Can create roles' },
    { name: 'Edit Roles', resource: 'roles', action: 'update', description: 'Can edit roles' },
    { name: 'Delete Roles', resource: 'roles', action: 'delete', description: 'Can delete roles' },

    // Permission Management
    { name: 'View Permissions', resource: 'permissions', action: 'read', description: 'Can view permissions' },
    { name: 'Create Permissions', resource: 'permissions', action: 'create', description: 'Can create permissions' },
    { name: 'Edit Permissions', resource: 'permissions', action: 'update', description: 'Can edit permissions' },
    { name: 'Delete Permissions', resource: 'permissions', action: 'delete', description: 'Can delete permissions' },

    // Module Management
    { name: 'View Modules', resource: 'modules', action: 'read', description: 'Can view modules' },
    { name: 'Create Modules', resource: 'modules', action: 'create', description: 'Can create modules' },
    { name: 'Edit Modules', resource: 'modules', action: 'update', description: 'Can edit modules' },
    { name: 'Delete Modules', resource: 'modules', action: 'delete', description: 'Can delete modules' },

    // Settings
    { name: 'View Settings', resource: 'settings', action: 'read', description: 'Can view settings' },
    { name: 'Edit Settings', resource: 'settings', action: 'update', description: 'Can edit settings' },

    // Reports
    { name: 'View Reports', resource: 'reports', action: 'read', description: 'Can view reports' },
    { name: 'Export Reports', resource: 'reports', action: 'export', description: 'Can export reports' },
  ];

  private defaultRoles: DefaultRole[] = [
    {
      name: 'Admin',
      description: 'Full system access',
      is_system: true,
      permissions: [
        'View Users', 'Create Users', 'Edit Users', 'Delete Users',
        'View Roles', 'Create Roles', 'Edit Roles', 'Delete Roles',
        'View Permissions', 'Create Permissions', 'Edit Permissions', 'Delete Permissions',
        'View Modules', 'Create Modules', 'Edit Modules', 'Delete Modules',
        'View Settings', 'Edit Settings',
        'View Reports', 'Export Reports',
      ],
    },
    {
      name: 'Manager',
      description: 'Management level access',
      is_system: false,
      permissions: [
        'View Users', 'Create Users', 'Edit Users',
        'View Roles',
        'View Permissions',
        'View Modules', 'Create Modules', 'Edit Modules',
        'View Settings',
        'View Reports', 'Export Reports',
      ],
    },
    {
      name: 'User',
      description: 'Basic user access',
      is_system: false,
      permissions: [
        'View Users',
        'View Modules',
        'View Reports',
      ],
    },
  ];

  async seed(tenantId: string): Promise<void> {
    // Check if already seeded
    const existingRoles = await this.roleRepo.count({
      where: { tenant_id: tenantId },
    });

    if (existingRoles > 0) {
      console.log(`Tenant ${tenantId} already has roles, skipping seed`);
      return;
    }

    // Create permissions
    const permissionMap = new Map<string, Permission>();
    for (const permDef of this.defaultPermissions) {
      const permission = this.permissionRepo.create({
        ...permDef,
        tenant_id: tenantId,
      });
      const saved = await this.permissionRepo.save(permission);
      permissionMap.set(permDef.name, saved);
    }

    console.log(`Created ${permissionMap.size} permissions for tenant ${tenantId}`);

    // Create roles and assign permissions
    for (const roleDef of this.defaultRoles) {
      const role = this.roleRepo.create({
        name: roleDef.name,
        description: roleDef.description,
        is_system: roleDef.is_system,
        tenant_id: tenantId,
      });
      const savedRole = await this.roleRepo.save(role);

      // Assign permissions to role
      const rolePermissions = roleDef.permissions
        .map((permName) => {
          const permission = permissionMap.get(permName);
          if (!permission) {
            console.warn(`Permission ${permName} not found`);
            return null;
          }
          return this.rolePermissionRepo.create({
            role_id: savedRole.id,
            permission_id: permission.id,
          });
        })
        .filter((rp): rp is RolePermission => rp !== null);

      await this.rolePermissionRepo.save(rolePermissions);
      console.log(
        `Created role ${roleDef.name} with ${rolePermissions.length} permissions`,
      );
    }

    console.log(`RBAC seeding completed for tenant ${tenantId}`);
  }

  async getDefaultAdminRole(tenantId: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { tenant_id: tenantId, name: 'Admin' },
    });
  }

  async getDefaultUserRole(tenantId: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { tenant_id: tenantId, name: 'User' },
    });
  }
}
