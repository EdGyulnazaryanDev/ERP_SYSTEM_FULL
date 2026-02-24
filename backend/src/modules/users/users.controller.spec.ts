import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockUser: User = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@example.com',
    password: 'hashedPassword',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    refreshToken: null,
    created_at: new Date(),
    updated_at: new Date(),
    tenant: null as any,
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkDelete: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      mockUsersService.create.mockResolvedValue({
        id: 'new-user-id',
        ...createDto,
        tenantId: mockTenantId,
      });

      const result = await controller.create(createDto, mockTenantId);

      expect(service.create).toHaveBeenCalledWith(createDto, mockTenantId);
      expect(result.email).toBe(createDto.email);
    });

    it('should strip role_id from create dto', async () => {
      const createDtoWithRole: any = {
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Smith',
        role_id: 'role-123',
      };

      mockUsersService.create.mockResolvedValue({
        id: 'new-user-id',
        email: createDtoWithRole.email,
        tenantId: mockTenantId,
      });

      await controller.create(createDtoWithRole, mockTenantId);

      expect(service.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ role_id: expect.anything() }),
        mockTenantId,
      );
    });

    it('should throw BadRequestException if email is missing', async () => {
      const createDto: any = {
        password: 'password123',
        first_name: 'Jane',
      };

      try {
        await controller.create(createDto, mockTenantId);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Email is required');
      }

      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default pagination', async () => {
      const mockPaginatedResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockUsersService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', undefined, mockTenantId);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        mockTenantId,
        1,
        10,
        undefined,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return paginated users with custom pagination', async () => {
      const mockPaginatedResponse = {
        data: [mockUser],
        total: 25,
        page: 2,
        pageSize: 20,
        totalPages: 2,
      };

      mockUsersService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('2', '20', undefined, mockTenantId);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        mockTenantId,
        2,
        20,
        undefined,
      );
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
    });

    it('should return paginated users with search term', async () => {
      const searchTerm = 'john';
      const mockPaginatedResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockUsersService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll('1', '10', searchTerm, mockTenantId);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        mockTenantId,
        1,
        10,
        searchTerm,
      );
      expect(result.data).toHaveLength(1);
    });

    it('should throw BadRequestException if tenantId is missing', async () => {
      try {
        await controller.findAll('1', '10', undefined, undefined);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Tenant ID is required');
      }

      expect(service.findAllPaginated).not.toHaveBeenCalled();
    });

    it('should use default values for page and pageSize', async () => {
      const mockPaginatedResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      mockUsersService.findAllPaginated.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll('1', '10', undefined, mockTenantId);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        mockTenantId,
        1,
        10,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUserId, mockTenantId);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockTenantId);
      expect(result).toEqual(mockUser);
    });

    it('should pass through service errors', async () => {
      mockUsersService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(controller.findOne('invalid-id', mockTenantId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto: UpdateUserDto = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserId, updateDto, mockTenantId);

      expect(service.update).toHaveBeenCalledWith(mockUserId, updateDto, mockTenantId);
      expect(result.first_name).toBe(updateDto.first_name);
      expect(result.last_name).toBe(updateDto.last_name);
    });

    it('should update user email', async () => {
      const updateDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };

      const updatedUser = { ...mockUser, email: updateDto.email };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserId, updateDto, mockTenantId);

      expect(result.email).toBe(updateDto.email);
    });

    it('should update user password', async () => {
      const updateDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      mockUsersService.update.mockResolvedValue(mockUser);

      await controller.update(mockUserId, updateDto, mockTenantId);

      expect(service.update).toHaveBeenCalledWith(mockUserId, updateDto, mockTenantId);
    });

    it('should update user active status', async () => {
      const updateDto: UpdateUserDto = {
        is_active: false,
      };

      const updatedUser = { ...mockUser, is_active: false };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserId, updateDto, mockTenantId);

      expect(result.is_active).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockUsersService.remove.mockResolvedValue({ success: true });

      const result = await controller.remove(mockUserId, mockTenantId);

      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockTenantId);
      expect(result).toEqual({ success: true });
    });

    it('should pass through service errors', async () => {
      mockUsersService.remove.mockRejectedValue(new Error('User not found'));

      await expect(controller.remove('invalid-id', mockTenantId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockUsersService.bulkDelete.mockResolvedValue({ deleted: 3 });

      const result = await controller.bulkDelete(userIds, mockTenantId);

      expect(service.bulkDelete).toHaveBeenCalledWith(userIds, mockTenantId);
      expect(result).toEqual({ deleted: 3 });
    });

    it('should handle empty array', async () => {
      const userIds: string[] = [];
      mockUsersService.bulkDelete.mockResolvedValue({ deleted: 0 });

      const result = await controller.bulkDelete(userIds, mockTenantId);

      expect(result).toEqual({ deleted: 0 });
    });

    it('should handle partial deletion', async () => {
      const userIds = ['user-1', 'invalid-id', 'user-3'];
      mockUsersService.bulkDelete.mockResolvedValue({ deleted: 2 });

      const result = await controller.bulkDelete(userIds, mockTenantId);

      expect(result.deleted).toBe(2);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateDto: UpdateUserDto = {
        first_name: 'Updated',
        last_name: 'Profile',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(updateDto, mockTenantId);

      expect(service.updateProfile).toHaveBeenCalledWith(updateDto, mockTenantId);
      expect(result.first_name).toBe(updateDto.first_name);
    });

    it('should update profile with password', async () => {
      const updateDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      mockUsersService.updateProfile.mockResolvedValue(mockUser);

      await controller.updateProfile(updateDto, mockTenantId);

      expect(service.updateProfile).toHaveBeenCalledWith(updateDto, mockTenantId);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';

      mockUsersService.changePassword.mockResolvedValue({ success: true });

      const result = await controller.changePassword(
        oldPassword,
        newPassword,
        mockTenantId,
      );

      expect(service.changePassword).toHaveBeenCalledWith(
        oldPassword,
        newPassword,
        mockTenantId,
      );
      expect(result).toEqual({ success: true });
    });

    it('should pass through service errors for invalid password', async () => {
      const oldPassword = 'wrongPassword';
      const newPassword = 'newPassword456';

      mockUsersService.changePassword.mockRejectedValue(
        new BadRequestException('Invalid current password'),
      );

      await expect(
        controller.changePassword(oldPassword, newPassword, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
