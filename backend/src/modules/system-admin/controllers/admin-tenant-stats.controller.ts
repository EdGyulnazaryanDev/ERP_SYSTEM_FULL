import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../../common/guards/system-admin.guard';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLogEntity } from '../../compliance-audit/entities/audit-log.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../types/express';

@Controller('admin')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminTenantStatsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** GET /admin/tenants/:id/stats — user count, recent users, transaction count */
  @Get('tenants/:id/stats')
  async tenantStats(@Param('id') id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const [users, userCount] = await this.userRepo.findAndCount({
      where: { tenantId: id },
      order: { created_at: 'DESC' },
      take: 10,
    });

    // Count audit log entries as a proxy for activity
    const activityCount = await this.auditLogRepo.count({ where: { tenant_id: id } });

    return {
      tenant: { id: tenant.id, name: tenant.name, domain: tenant.domain, isActive: tenant.isActive, createdAt: tenant.createdAt },
      userCount,
      activityCount,
      recentUsers: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
        isActive: u.is_active,
        createdAt: u.created_at,
      })),
    };
  }

  /** POST /admin/impersonate/:tenantId — issue a short-lived token as tenant admin */
  @Post('impersonate/:tenantId')
  async impersonate(
    @Param('tenantId') tenantId: string,
    @CurrentUser() admin: JwtUser,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Find the first admin user for this tenant
    const users = await this.userRepo.find({ where: { tenantId }, order: { created_at: 'ASC' } });
    if (!users.length) throw new NotFoundException('No users found for this tenant');

    // Prefer a user whose email suggests admin, otherwise take first
    const adminUser = users.find((u) => u.email.toLowerCase().includes('admin')) ?? users[0];

    const payload = {
      sub: adminUser.id,
      tenantId,
      email: adminUser.email,
      actorType: 'staff',
      principalId: adminUser.id,
      role: 'admin',
      name: [adminUser.first_name, adminUser.last_name].filter(Boolean).join(' ') || adminUser.email,
      isSystemAdmin: false,
      impersonatedBy: admin.sub,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '4h',
    });

    return { accessToken, tenantName: tenant.name, userEmail: adminUser.email };
  }

  /** GET /admin/activity-log — global audit log across all tenants */
  @Get('activity-log')
  async activityLog() {
    const logs = await this.auditLogRepo.find({
      order: { created_at: 'DESC' },
      take: 500,
    });
    return logs;
  }
}
