import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../../roles/user-role.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { DefaultRbacSeeder } from '../../../database/seeders/default-rbac.seeder';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { AuditAction, AuditSeverity } from '../../compliance-audit/entities/audit-log.entity';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rbacSeeder: DefaultRbacSeeder,
    private readonly complianceAuditService: ComplianceAuditService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.complianceAuditService
        .createAuditLog(
          {
            action: AuditAction.LOGIN,
            entity_type: 'auth',
            entity_id: user.id,
            description: 'Failed login attempt (invalid password)',
            severity: AuditSeverity.MEDIUM,
          },
          user.id,
          user.tenantId,
        )
        .catch(() => undefined);
      throw new UnauthorizedException();
    }

    await this.complianceAuditService
      .createAuditLog(
        {
          action: AuditAction.LOGIN,
          entity_type: 'auth',
          entity_id: user.id,
          description: 'Successful login',
          severity: AuditSeverity.LOW,
        },
        user.id,
        user.tenantId,
      )
      .catch(() => undefined);

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
    );

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async register(dto: RegisterDto) {
    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    const tenant: Tenant = await this.tenantRepo.save({
      name: dto.companyName,
    });

    await this.subscriptionsService.createDefaultSubscriptionForTenant(tenant.id);

    // Seed default RBAC for new tenant
    await this.rbacSeeder.seed(tenant.id);

    // Get default Admin role
    const adminRole = await this.rbacSeeder.getDefaultAdminRole(tenant.id);

    if (!adminRole) {
      throw new Error('Failed to create default admin role');
    }

    const user: User = await this.userRepo.save({
      email: dto.email,
      password: hashedPassword,
      first_name: dto.firstName,
      last_name: dto.lastName,
      tenantId: tenant.id,
    });

    // Assign admin role to first user
    await this.userRoleRepo.save({
      user_id: user.id,
      role_id: adminRole.id,
    });

    const tokens = await this.generateTokens(user.id, tenant.id, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, tenantId: string) {
    await this.userRepo.update(userId, {
      refreshToken: null,
    });

    await this.complianceAuditService
      .createAuditLog(
        {
          action: AuditAction.LOGOUT,
          entity_type: 'auth',
          entity_id: userId,
          description: 'User logged out',
          severity: AuditSeverity.LOW,
        },
        userId,
        tenantId,
      )
      .catch(() => undefined);

    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateTokens(
        user.id,
        user.tenantId,
        user.email,
      );

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
  ) {
    const payload = { sub: userId, tenantId, email };

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpires = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpires = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    console.log('🔑 JWT Config:', {
      accessExpires,
      refreshExpires,
    });

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpires as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires as any,
    });

    return { accessToken, refreshToken };
  }
  async quickTestLogin() {
    // For testing - get first user and generate tokens
    const user = await this.userRepo.findOne({
      where: {},
    });

    if (!user) {
      throw new Error(
        'No test user found. Please create a user first via registration.',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
    );

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    await this.userRepo.update(userId, {
      refreshToken: hashed,
    });
  }
}
