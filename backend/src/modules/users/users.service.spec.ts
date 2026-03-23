import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const bcrypt = require('bcrypt');

  const mockUser: User = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@example.com',
    password: 'hashedPassword123',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    isSystemAdmin: false,
    refreshToken: null,
    created_at: new Date(),
    updated_at: new Date(),
    tenant: null as any,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: SubscriptionsService,
          useValue: {
            assertCanAddUser: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
        is_active: true,
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockRepository.findOne.mockResolvedValue(null); // No existing user
      mockRepository.create.mockReturnValue({
        ...createDto,
        tenantId: mockTenantId,
        password: hashedPassword,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...createDto,
        tenantId: mockTenantId,
        password: hashedPassword,
      });

      const result = await service.create(createDto, mockTenantId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createDto.email, tenantId: mockTenantId },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 10);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(createDto.email);
    });

    it('should throw BadRequestException if user with email already exists', async () => {
      const createDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockRepository.findOne.mockResolvedValue(mockUser); // Existing user

      await expect(service.create(createDto, mockTenantId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, mockTenantId)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createDto.email, tenantId: mockTenantId },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should create user without password if not provided', async () => {
      const createDto: CreateUserDto = {
        email: 'nopassword@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...createDto,
        tenantId: mockTenantId,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...createDto,
        tenantId: mockTenantId,
      });

      const result = await service.create(createDto, mockTenantId);

      expect(result.email).toBe(createDto.email);
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should set is_active to true by default', async () => {
      const createDto: CreateUserDto = {
        email: 'active@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...createDto,
        tenantId: mockTenantId,
        is_active: true,
      });
      mockRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...createDto,
        tenantId: mockTenantId,
        is_active: true,
      });

      const result = await service.create(createDto, mockTenantId);

      expect(result.is_active).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a user by id and tenantId', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUserId, mockTenantId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId, tenantId: mockTenantId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id', mockTenantId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users for a tenant', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-456' }];
      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll(mockTenantId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no users found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockTenantId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-456' }];
      mockRepository.findAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await service.findAllPaginated(mockTenantId, 1, 10);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should handle pagination correctly for page 2', async () => {
      const mockUsers = [mockUser];
      mockRepository.findAndCount.mockResolvedValue([mockUsers, 15]);

      const result = await service.findAllPaginated(mockTenantId, 2, 10);

      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        skip: 10,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by search term', async () => {
      const mockUsers = [mockUser];
      mockRepository.findAndCount.mockResolvedValue([mockUsers, 1]);

      const result = await service.findAllPaginated(mockTenantId, 1, 10, 'test');

      expect(mockRepository.findAndCount).toHaveBeenCalled();
      expect(result.data).toEqual(mockUsers);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateDto: UpdateUserDto = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call in findOne
        .mockResolvedValueOnce(updatedUser); // Second call after update
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(mockUserId, updateDto, mockTenantId);

      expect(mockRepository.update).toHaveBeenCalledWith(mockUserId, updateDto);
      expect(result.first_name).toBe(updateDto.first_name);
      expect(result.last_name).toBe(updateDto.last_name);
    });

    it('should hash password when updating', async () => {
      const updateDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      const hashedPassword = 'newHashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, password: hashedPassword });
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(mockUserId, updateDto, mockTenantId);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockRepository.update).toHaveBeenCalledWith(mockUserId, {
        password: hashedPassword,
      });
    });

    it('should throw BadRequestException if new email is already taken', async () => {
      const updateDto: UpdateUserDto = {
        email: 'taken@example.com',
      };

      const existingUser = { ...mockUser, id: 'other-user-id' };

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser) // Current user in findOne
        .mockResolvedValueOnce(existingUser); // User with new email exists

      await expect(
        service.update(mockUserId, updateDto, mockTenantId),
      ).rejects.toThrow(BadRequestException);
      
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should allow updating to same email', async () => {
      const updateDto: UpdateUserDto = {
        email: mockUser.email, // Same email
        first_name: 'Updated',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, first_name: 'Updated' });
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(mockUserId, updateDto, mockTenantId);

      expect(result.first_name).toBe('Updated');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', {}, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove(mockUserId, mockTenantId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUserId, tenantId: mockTenantId },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id', mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple users successfully', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockRepository.delete.mockResolvedValue({ affected: 3 } as any);

      const result = await service.bulkDelete(userIds, mockTenantId);

      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: userIds,
        tenantId: mockTenantId,
      });
      expect(result).toEqual({ deleted: 3 });
    });

    it('should return 0 if no users deleted', async () => {
      const userIds = ['non-existent-1', 'non-existent-2'];
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await service.bulkDelete(userIds, mockTenantId);

      expect(result).toEqual({ deleted: 0 });
    });

    it('should handle undefined affected count', async () => {
      const userIds = ['user-1'];
      mockRepository.delete.mockResolvedValue({} as any);

      const result = await service.bulkDelete(userIds, mockTenantId);

      expect(result).toEqual({ deleted: 0 });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';
      const hashedNewPassword = 'hashedNewPassword';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedNewPassword);

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.changePassword(
        oldPassword,
        newPassword,
        mockTenantId,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: hashedNewPassword,
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException if old password is invalid', async () => {
      const oldPassword = 'wrongPassword';
      const newPassword = 'newPassword456';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.changePassword(oldPassword, newPassword, mockTenantId),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('old', 'new', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto: UpdateUserDto = {
        first_name: 'Updated',
        last_name: 'Profile',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser) // First call
        .mockResolvedValueOnce({ ...mockUser, ...updateDto }); // After update
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateProfile(updateDto, mockTenantId);

      expect(result.first_name).toBe(updateDto.first_name);
      expect(result.last_name).toBe(updateDto.last_name);
    });

    it('should hash password when updating profile', async () => {
      const updateDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      const hashedPassword = 'hashedNewPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, password: hashedPassword });
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateProfile(updateDto, mockTenantId);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: hashedPassword,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile({}, mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
