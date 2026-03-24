import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemAdmin } from './entities/system-admin.entity';
import { GlobalSetting } from './entities/global-setting.entity';
import { Tenant } from '../tenants/tenant.entity';
import { AdminTenantsController } from './controllers/admin-tenants.controller';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { ComplianceAuditModule } from '../compliance-audit/compliance-audit.module';
import { SystemAdminSeedService } from './system-admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemAdmin, GlobalSetting, Tenant]),
    ComplianceAuditModule,
  ],
  controllers: [
    AdminTenantsController,
    AdminSubscriptionsController,
    AdminSettingsController,
  ],
  providers: [SystemAdminSeedService],
  exports: [SystemAdminSeedService],
})
export class SystemAdminModule {}
