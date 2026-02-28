import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refresh: jest.fn(),
            refreshToken: jest.fn(),
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test Company',
      };

      const result = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      authService.register.mockResolvedValue(result as any);

      const response = await controller.register(registerDto as any);

      expect(response).toEqual(result);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      authService.login.mockResolvedValue(result as any);

      const response = await controller.login(loginDto as any);

      expect(response).toEqual(result);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('logout', () => {
    it('should logout a user', async () => {
      const user = { sub: 'user-1', tenantId: 'tenant-1', email: 'test@example.com' };
      const result = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(result as any);

      const response = await controller.logout(user as any);

      expect(response).toEqual(result);
      expect(authService.logout).toHaveBeenCalledWith(user.sub);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const refreshDto = {
        refreshToken: 'old-refresh-token',
      };

      const result = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.refresh.mockResolvedValue(result as any);

      const response = await controller.refresh(refreshDto as any);

      expect(response).toEqual(result);
      expect(authService.refresh).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
    });
  });
});
