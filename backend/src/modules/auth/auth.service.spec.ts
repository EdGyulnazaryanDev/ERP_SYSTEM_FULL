import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './services/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserRole } from '../roles/user-role.entity';
import { DefaultRbacSeeder } from '../../database/seeders/default-rbac.seeder';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let tenantRepo: Repository<Tenant>;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let userRoleRepo: Repository<UserRole>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let rbacSeeder: DefaultRbacSeeder;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Company',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    tenantId: 'tenant-1',
    first_name: 'Test',
    last_name: 'User',
  };

  const mockRole = {
    id: 'role-1',
    name: 'Admin',
    is_system: true,
    tenant_id: 'tenant-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
        {
          provide: DefaultRbacSeeder,
          useValue: {
            seed: jest.fn(),
            getDefaultAdminRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    rbacSeeder = module.get<DefaultRbacSeeder>(DefaultRbacSeeder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedRefreshToken');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: loginDto.email } });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = { email: 'notfound@example.com', password: 'password123' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should register a new user and tenant successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        companyName: 'New Company',
      };

      jest.spyOn(tenantRepo, 'save').mockResolvedValue(mockTenant as any);
      jest.spyOn(rbacSeeder, 'seed').mockResolvedValue(undefined);
      jest.spyOn(rbacSeeder, 'getDefaultAdminRole').mockResolvedValue(mockRole as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser as any);
      jest.spyOn(userRoleRepo, 'save').mockResolvedValue({} as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token');
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(tenantRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(rbacSeeder.seed).toHaveBeenCalledWith(mockTenant.id);
    });

    it('should throw error if admin role creation fails', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        companyName: 'New Company',
      };

      jest.spyOn(tenantRepo, 'save').mockResolvedValue(mockTenant as any);
      jest.spyOn(rbacSeeder, 'seed').mockResolvedValue(undefined);
      jest.spyOn(rbacSeeder, 'getDefaultAdminRole').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await expect(service.register(registerDto)).rejects.toThrow('Failed to create default admin role');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const userId = 'user-1';
      
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

      const result = await service.logout(userId);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(userRepo.update).toHaveBeenCalledWith(userId, { refreshToken: null });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'validRefreshToken';
      const payload = { sub: 'user-1', tenantId: 'tenant-1', email: 'test@example.com' };
      
      jest.spyOn(jwtService, 'verify').mockReturnValue(payload as any);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ ...mockUser, refreshToken: 'hashedToken' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedToken');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('newToken');
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const refreshToken = 'invalidToken';
      
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
