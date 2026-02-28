import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { NotFoundException } from '@nestjs/common';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepo: jest.Mocked<Repository<Permission>>;
  let rolePermissionRepo: jest.Mocked<Repository<RolePermission>>;

  const mockPermission: Permission = {
    id: 'perm-1',
    tenant_id: 'tenant-1',
    resource: 'products',
    action: 'read',
    name: 'Read Products',
    description: 'Can read products',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionRepo = module.get(getRepositoryToken(Permission));
    rolePermissionRepo = module.get(getRepositoryToken(RolePermission));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all permissions for tenant', async () => {
      const permissions = [mockPermission];
      permissionRepo.find.mockResolvedValue(permissions);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(permissions);
      expect(permissionRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { resource: 'ASC', action: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return permission by id', async () => {
      permissionRepo.findOne.mockResolvedValue(mockPermission);

      const result = await service.findOne('perm-1', 'tenant-1');

      expect(result).toEqual(mockPermission);
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'perm-1', tenant_id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if permission not found', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('perm-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create permission successfully', async () => {
      const createDto = {
        resource: 'products',
        action: 'create',
        name: 'Create Products',
        description: 'Can create products',
      };

      const newPermission = { ...mockPermission, ...createDto };
      permissionRepo.create.mockReturnValue(newPermission);
      permissionRepo.save.mockResolvedValue(newPermission);

      const result = await service.create(createDto, 'tenant-1');

      expect(result).toEqual(newPermission);
      expect(permissionRepo.create).toHaveBeenCalledWith({
        ...createDto,
        tenant_id: 'tenant-1',
      });
    });
  });

  describe('update', () => {
    it('should update permission successfully', async () => {
      const updateDto = { description: 'Updated description' };
      const updated = { ...mockPermission, ...updateDto };

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.save.mockResolvedValue(updated);

      const result = await service.update('perm-1', updateDto, 'tenant-1');

      expect(result.description).toBe('Updated description');
      expect(permissionRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if permission not found', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('perm-999', { description: 'Test' }, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete permission successfully', async () => {
      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.remove.mockResolvedValue(mockPermission);

      await service.remove('perm-1', 'tenant-1');

      expect(permissionRepo.remove).toHaveBeenCalledWith(mockPermission);
    });

    it('should throw NotFoundException if permission not found', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('perm-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignToRole', () => {
    it('should assign permissions to role successfully', async () => {
      const permissionIds = ['perm-1', 'perm-2'];
      const permissions = [
        mockPermission,
        { ...mockPermission, id: 'perm-2' },
      ];

      rolePermissionRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
      permissionRepo.find.mockResolvedValue(permissions);
      rolePermissionRepo.create.mockImplementation((data) => data as RolePermission);
      rolePermissionRepo.save.mockResolvedValue([] as any);

      await service.assignToRole('role-1', permissionIds, 'tenant-1');

      expect(rolePermissionRepo.delete).toHaveBeenCalledWith({ role_id: 'role-1' });
      expect(rolePermissionRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if some permissions not found', async () => {
      const permissionIds = ['perm-1', 'perm-2'];
      const permissions = [mockPermission]; // Only 1 found

      rolePermissionRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
      permissionRepo.find.mockResolvedValue(permissions);

      await expect(
        service.assignToRole('role-1', permissionIds, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for role', async () => {
      const rolePermissions = [
        {
          role_id: 'role-1',
          permission_id: 'perm-1',
          permission: mockPermission,
        },
      ];

      rolePermissionRepo.find.mockResolvedValue(rolePermissions as any);

      const result = await service.getRolePermissions('role-1', 'tenant-1');

      expect(result).toEqual([mockPermission]);
      expect(rolePermissionRepo.find).toHaveBeenCalledWith({
        where: { role_id: 'role-1' },
        relations: ['permission'],
      });
    });

    it('should filter out permissions from other tenants', async () => {
      const rolePermissions = [
        {
          role_id: 'role-1',
          permission_id: 'perm-1',
          permission: mockPermission,
        },
        {
          role_id: 'role-1',
          permission_id: 'perm-2',
          permission: { ...mockPermission, id: 'perm-2', tenant_id: 'tenant-2' },
        },
      ];

      rolePermissionRepo.find.mockResolvedValue(rolePermissions as any);

      const result = await service.getRolePermissions('role-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('perm-1');
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for user', async () => {
      const permissions = [mockPermission];
      permissionRepo.query.mockResolvedValue(permissions);

      const result = await service.getUserPermissions('user-1', 'tenant-1');

      expect(result).toEqual(permissions);
    });
  });

  describe('checkUserPermission', () => {
    it('should return true if user has permission', async () => {
      permissionRepo.query.mockResolvedValue([{ count: '1' }]);

      const result = await service.checkUserPermission(
        'user-1',
        'products',
        'read',
        'tenant-1',
      );

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      permissionRepo.query.mockResolvedValue([{ count: '0' }]);

      const result = await service.checkUserPermission(
        'user-1',
        'products',
        'delete',
        'tenant-1',
      );

      expect(result).toBe(false);
    });
  });
});
