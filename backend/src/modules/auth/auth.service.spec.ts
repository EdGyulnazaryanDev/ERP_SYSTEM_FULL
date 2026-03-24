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
import { CustomerEntity } from '../crm/entities/customer.entity';
import { ActivityEntity } from '../crm/entities/activity.entity';
import { QuoteEntity } from '../crm/entities/quote.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { PortalAccountEntity } from './entities/portal-account.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { ShipmentEntity } from '../transportation/entities/shipment.entity';
import { AccountReceivableEntity } from '../accounting/entities/account-receivable.entity';
import { AccountPayableEntity } from '../accounting/entities/account-payable.entity';
import { DefaultRbacSeeder } from '../../database/seeders/default-rbac.seeder';
import { ComplianceAuditService } from '../compliance-audit/compliance-audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const makeRepoMock = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  existsBy: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let tenantRepo: Repository<Tenant>;
  let userRepo: Repository<User>;
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
    isSystemAdmin: false,
    refreshToken: 'hashedToken',
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
        { provide: getRepositoryToken(Tenant), useValue: makeRepoMock() },
        { provide: getRepositoryToken(User), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Role), useValue: makeRepoMock() },
        { provide: getRepositoryToken(UserRole), useValue: makeRepoMock() },
        { provide: getRepositoryToken(CustomerEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(ActivityEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(QuoteEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(SupplierEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(PortalAccountEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(TransactionEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(ShipmentEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(AccountReceivableEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(AccountPayableEntity), useValue: makeRepoMock() },
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
        {
          provide: ComplianceAuditService,
          useValue: {
            createAuditLog: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            createDefaultSubscriptionForTenant: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tenantRepo = module.get(getRepositoryToken(Tenant));
    userRepo = module.get(getRepositoryToken(User));
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
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token' as any);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret' as any);
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

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
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('token' as any);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret' as any);
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

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
      const portalAccountRepo = service['portalAccountRepo'];

      jest.spyOn(portalAccountRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

      const result = await service.logout(userId, 'tenant-1');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(userRepo.update).toHaveBeenCalledWith(userId, { refreshToken: null });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'validRefreshToken';
      const payload = {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        actorType: 'staff',
        principalId: 'user-1',
        role: 'user',
        name: 'Test User',
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(payload as any);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ ...mockUser, refreshToken: 'hashedToken' } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedToken');
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('newToken' as any);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret' as any);
      jest.spyOn(userRepo, 'update').mockResolvedValue({} as any);

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
