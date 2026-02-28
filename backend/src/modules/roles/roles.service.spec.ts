import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let userRoleRepo: jest.Mocked<Repository<UserRole>>;
  let permissionsService: jest.Mocked<PermissionsService>;

  const mockRole: Role = {
    id: 'role-1',
    tenant_id: 'tenant-1',
    name: 'Manager',
    description: 'Manager role',
    is_system: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSystemRole: Role = {
    id: 'role-sys',
    tenant_id: 'tenant-1',
    name: 'Admin',
    description: 'System admin',
    is_system: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
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
          provide: getRepositoryToken(UserRole),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            assignToRole: jest.fn(),
            getRolePermissions: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepo = module.get(getRepositoryToken(Role));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    permissionsService = module.get(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all roles for tenant', async () => {
      const roles = [mockRole];
      roleRepo.find.mockResolvedValue(roles);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(roles);
      expect(roleRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return role by id', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);

      const result = await service.findOne('role-1', 'tenant-1');

      expect(result).toEqual(mockRole);
      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'role-1', tenant_id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('role-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create role successfully', async () => {
      const createDto = {
        name: 'Editor',
        description: 'Content editor',
      };

      const newRole = { ...mockRole, ...createDto };
      roleRepo.create.mockReturnValue(newRole);
      roleRepo.save.mockResolvedValue(newRole);

      const result = await service.create(createDto, 'tenant-1');

      expect(result).toEqual(newRole);
      expect(roleRepo.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        tenant_id: 'tenant-1',
      });
      expect(roleRepo.save).toHaveBeenCalled();
    });

    it('should create role with permissions', async () => {
      const createDto = {
        name: 'Editor',
        description: 'Content editor',
        permissionIds: ['perm-1', 'perm-2'],
      };

      const newRole = { ...mockRole, name: createDto.name };
      roleRepo.create.mockReturnValue(newRole);
      roleRepo.save.mockResolvedValue(newRole);
      permissionsService.assignToRole.mockResolvedValue(undefined);

      const result = await service.create(createDto, 'tenant-1');

      expect(result).toEqual(newRole);
      expect(permissionsService.assignToRole).toHaveBeenCalledWith(
        newRole.id,
        createDto.permissionIds,
        'tenant-1',
      );
    });
  });

  describe('update', () => {
    it('should update non-system role successfully', async () => {
      const updateDto = { description: 'Updated description' };
      const updated = { ...mockRole, ...updateDto };

      roleRepo.findOne.mockResolvedValue(mockRole);
      roleRepo.save.mockResolvedValue(updated);

      const result = await service.update('role-1', updateDto, 'tenant-1');

      expect(result.description).toBe('Updated description');
      expect(roleRepo.save).toHaveBeenCalled();
    });

    it('should update role with permissions', async () => {
      const updateDto = {
        description: 'Updated description',
        permissionIds: ['perm-1', 'perm-2'],
      };
      const updated = { ...mockRole, ...updateDto };

      roleRepo.findOne.mockResolvedValue(mockRole);
      roleRepo.save.mockResolvedValue(updated);
      permissionsService.assignToRole.mockResolvedValue(undefined);

      const result = await service.update('role-1', updateDto, 'tenant-1');

      expect(result).toEqual(updated);
      expect(permissionsService.assignToRole).toHaveBeenCalledWith(
        'role-1',
        updateDto.permissionIds,
        'tenant-1',
      );
    });

    it('should throw BadRequestException when updating system role', async () => {
      const updateDto = { description: 'Try to update' };

      roleRepo.findOne.mockResolvedValue(mockSystemRole);

      await expect(
        service.update('role-sys', updateDto, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete non-system role successfully', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.count.mockResolvedValue(0);
      roleRepo.remove.mockResolvedValue(mockRole);

      await service.remove('role-1', 'tenant-1');

      expect(roleRepo.remove).toHaveBeenCalledWith(mockRole);
    });

    it('should throw BadRequestException when deleting system role', async () => {
      roleRepo.findOne.mockResolvedValue(mockSystemRole);

      await expect(service.remove('role-sys', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when role has users', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.count.mockResolvedValue(5);

      await expect(service.remove('role-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      const userRole = {
        user_id: 'user-1',
        role_id: 'role-1',
      };

      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.findOne.mockResolvedValue(null);
      userRoleRepo.create.mockReturnValue(userRole as UserRole);
      userRoleRepo.save.mockResolvedValue(userRole as UserRole);

      await service.assignRoleToUser('user-1', 'role-1', 'tenant-1');

      expect(userRoleRepo.save).toHaveBeenCalled();
    });

    it('should not assign if already assigned', async () => {
      const existingUserRole = {
        user_id: 'user-1',
        role_id: 'role-1',
      };

      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.findOne.mockResolvedValue(existingUserRole as UserRole);

      await service.assignRoleToUser('user-1', 'role-1', 'tenant-1');

      expect(userRoleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user successfully', async () => {
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.removeRoleFromUser('user-1', 'role-1', 'tenant-1');

      expect(userRoleRepo.delete).toHaveBeenCalledWith({
        user_id: 'user-1',
        role_id: 'role-1',
      });
    });
  });

  describe('getUserRoles', () => {
    it('should return all roles for user', async () => {
      const roles = [mockRole];
      roleRepo.query.mockResolvedValue(roles);

      const result = await service.getUserRoles('user-1', 'tenant-1');

      expect(result).toEqual(roles);
    });
  });

  describe('getRoleUsers', () => {
    it('should return all users for role', async () => {
      const users = [
        { id: 'user-1', email: 'test@example.com', first_name: 'Test', last_name: 'User' },
      ];

      roleRepo.findOne.mockResolvedValue(mockRole);
      roleRepo.query.mockResolvedValue(users);

      const result = await service.getRoleUsers('role-1', 'tenant-1');

      expect(result).toEqual(users);
    });
  });
});
