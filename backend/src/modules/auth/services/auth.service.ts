import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../../roles/user-role.entity';
import { CustomerEntity, CustomerStatus } from '../../crm/entities/customer.entity';
import { SupplierEntity } from '../../suppliers/supplier.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ActivatePortalAccountDto } from '../dto/activate-portal-account.dto';
import { SetPortalCredentialsDto } from '../dto/set-portal-credentials.dto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { DefaultRbacSeeder } from '../../../database/seeders/default-rbac.seeder';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { AuditAction, AuditSeverity } from '../../compliance-audit/entities/audit-log.entity';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { PortalAccountEntity, PortalActorType } from '../entities/portal-account.entity';

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

    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,

    @InjectRepository(SupplierEntity)
    private supplierRepo: Repository<SupplierEntity>,

    @InjectRepository(PortalAccountEntity)
    private portalAccountRepo: Repository<PortalAccountEntity>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rbacSeeder: DefaultRbacSeeder,
    private readonly subscriptionsService: SubscriptionsService,
    @Optional()
    private readonly complianceAuditService?: ComplianceAuditService,
  ) {}

  async login(dto: LoginDto) {
    if (dto.actorType && dto.actorType !== 'staff') {
      return this.loginPortal(dto);
    }

    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.complianceAuditService?.createAuditLog(
        {
          action: AuditAction.LOGIN,
          entity_type: 'auth',
          entity_id: user.id,
          description: 'Failed login attempt (invalid password)',
          severity: AuditSeverity.MEDIUM,
        },
        user.id,
        user.tenantId,
      );
      throw new UnauthorizedException();
    }

    await this.complianceAuditService?.createAuditLog(
      {
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: user.id,
        description: 'Successful login',
        severity: AuditSeverity.LOW,
      },
      user.id,
      user.tenantId,
    );

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
      'staff',
      user.id,
      'user',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  async activatePortalAccount(dto: ActivatePortalAccountDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const email = dto.email.trim().toLowerCase();
    const { actorId, tenantId, displayName } = await this.resolvePortalActor(
      dto.actorType,
      email,
    );

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: dto.actorType,
        actor_id: actorId,
      },
    });

    if (!portalAccount) {
      portalAccount = this.portalAccountRepo.create({
        tenant_id: tenantId,
        actor_type: dto.actorType,
        actor_id: actorId,
        email,
        display_name: displayName,
        password: hashedPassword,
        is_active: true,
      });
    } else {
      portalAccount.email = email;
      portalAccount.display_name = displayName;
      portalAccount.password = hashedPassword;
      portalAccount.is_active = true;
    }

    await this.portalAccountRepo.save(portalAccount);

    const tokens = await this.generateTokens(
      portalAccount.id,
      tenantId,
      email,
      dto.actorType,
      actorId,
      dto.actorType,
      displayName,
    );

    await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);

    return tokens;
  }

  async setPortalCredentials(dto: SetPortalCredentialsDto, tenantId: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const actor = await this.resolvePortalActorById(dto.actorType, dto.actorId, tenantId);
    const email = dto.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existingEmailOwner = await this.portalAccountRepo.findOne({
      where: { actor_type: dto.actorType, email },
    });

    if (existingEmailOwner && existingEmailOwner.actor_id !== actor.actorId) {
      throw new ConflictException('Email is already assigned to another portal account');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const displayName = actor.displayName || email;

    let portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: dto.actorType,
        actor_id: actor.actorId,
      },
    });

    if (!portalAccount) {
      portalAccount = this.portalAccountRepo.create({
        tenant_id: tenantId,
        actor_type: dto.actorType,
        actor_id: actor.actorId,
        email,
        display_name: displayName,
        password: hashedPassword,
        is_active: true,
      });
    } else {
      portalAccount.email = email;
      portalAccount.display_name = displayName;
      portalAccount.password = hashedPassword;
      portalAccount.is_active = true;
    }

    await this.portalAccountRepo.save(portalAccount);

    return { message: 'Portal credentials saved' };
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

    const tokens = await this.generateTokens(
      user.id,
      tenant.id,
      user.email,
      'staff',
      user.id,
      'admin',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, tenantId: string) {
    const portalAccount = await this.portalAccountRepo.findOne({
      where: { id: userId },
    });

    if (portalAccount) {
      await this.portalAccountRepo.update(userId, {
        refreshToken: null,
      });
    } else {
      await this.userRepo.update(userId, {
        refreshToken: null,
      });
    }

    await this.complianceAuditService?.createAuditLog(
      {
        action: AuditAction.LOGOUT,
        entity_type: 'auth',
        entity_id: userId,
        description: 'User logged out',
        severity: AuditSeverity.LOW,
      },
      userId,
      tenantId,
    );

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
      if (payload.actorType === 'staff') {
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
          'staff',
          user.id,
          payload.role ?? 'user',
          payload.name,
        );

        await this.updateRefreshToken('staff', user.id, tokens.refreshToken);
        return tokens;
      }

      const portalAccount = await this.portalAccountRepo.findOne({
        where: { id: payload.sub },
      });

      if (!portalAccount || !portalAccount.refreshToken) {
        throw new UnauthorizedException();
      }

      const isMatch = await bcrypt.compare(refreshToken, portalAccount.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateTokens(
        portalAccount.id,
        portalAccount.tenant_id,
        portalAccount.email,
        payload.actorType,
        payload.principalId,
        payload.role,
        portalAccount.display_name,
      );

      await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
    actorType: 'staff' | 'customer' | 'supplier',
    principalId: string,
    role?: string,
    name?: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      actorType,
      principalId,
      role,
      name,
    };

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
      'staff',
      user.id,
      'user',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  private async updateRefreshToken(
    accountType: 'staff' | 'portal',
    userId: string,
    refreshToken: string,
  ) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    if (accountType === 'portal') {
      await this.portalAccountRepo.update(userId, {
        refreshToken: hashed,
      });
      return;
    }

    await this.userRepo.update(userId, {
      refreshToken: hashed,
    });
  }

  private async loginPortal(dto: LoginDto) {
    const actorType = dto.actorType as PortalActorType;
    const portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: actorType,
        email: dto.email.trim().toLowerCase(),
        is_active: true,
      },
    });

    if (!portalAccount) {
      throw new UnauthorizedException('Portal account is not activated');
    }

    const isMatch = await bcrypt.compare(dto.password, portalAccount.password);
    if (!isMatch) {
      throw new UnauthorizedException();
    }

    const tokens = await this.generateTokens(
      portalAccount.id,
      portalAccount.tenant_id,
      portalAccount.email,
      actorType,
      portalAccount.actor_id,
      actorType,
      portalAccount.display_name,
    );

    await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);
    return tokens;
  }

  private async resolvePortalActor(actorType: PortalActorType, email: string) {
    if (actorType === PortalActorType.CUSTOMER) {
      const customer = await this.customerRepo.findOne({
        where: {
          email,
          status: CustomerStatus.ACTIVE,
        },
      });

      if (!customer) {
        throw new UnauthorizedException('No active customer found for this email');
      }

      return {
        actorId: customer.id,
        tenantId: customer.tenant_id,
        displayName: customer.company_name || customer.contact_person || customer.email,
      };
    }

    const supplier = await this.supplierRepo.findOne({
      where: {
        email,
        is_active: true,
      },
    });

    if (!supplier) {
      throw new UnauthorizedException('No active supplier found for this email');
    }

    return {
      actorId: supplier.id,
      tenantId: supplier.tenant_id,
      displayName: supplier.name || supplier.email || 'Supplier',
    };
  }

  private async resolvePortalActorById(
    actorType: PortalActorType,
    actorId: string,
    tenantId: string,
  ) {
    if (actorType === PortalActorType.CUSTOMER) {
      const customer = await this.customerRepo.findOne({
        where: { id: actorId, tenant_id: tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return {
        actorId: customer.id,
        tenantId: customer.tenant_id,
        displayName:
          customer.company_name || customer.contact_person || customer.email,
        email: customer.email,
      };
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: actorId, tenant_id: tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      actorId: supplier.id,
      tenantId: supplier.tenant_id,
      displayName: supplier.name || supplier.email || 'Supplier',
      email: supplier.email,
    };
  }
}
