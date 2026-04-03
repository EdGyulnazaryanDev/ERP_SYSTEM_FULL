import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SystemAdmin } from './entities/system-admin.entity';
import { GlobalSetting } from './entities/global-setting.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { AuditLogEntity } from '../compliance-audit/entities/audit-log.entity';
import { ChartOfAccountEntity } from '../accounting/entities/chart-of-account.entity';
import { AdminTenantsController } from './controllers/admin-tenants.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminTenantStatsController } from './controllers/admin-tenant-stats.controller';
import { AdminSystemHealthController } from './controllers/admin-system-health.controller';
import { AdminIntegrationsController } from '../admin/admin-integrations.controller';
import { ComplianceAuditModule } from '../compliance-audit/compliance-audit.module';
import { SystemAdminSeedService } from './system-admin-seed.service';
import { DefaultCoaSeeder } from '../../database/seeders/default-coa.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemAdmin, GlobalSetting, Tenant, User, AuditLogEntity, ChartOfAccountEntity]),
    ComplianceAuditModule,
    JwtModule.register({}),
  ],
  controllers: [
    AdminTenantsController,
    AdminSubscriptionsController,
    AdminSettingsController,
    AdminTenantStatsController,
    AdminSystemHealthController,
    AdminIntegrationsController,
  ],
  providers: [SystemAdminSeedService, DefaultCoaSeeder],
  exports: [SystemAdminSeedService],
})
export class SystemAdminModule {}
