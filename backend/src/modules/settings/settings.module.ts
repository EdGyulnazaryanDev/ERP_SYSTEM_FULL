import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PageAccessEntity } from './entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { Role } from '../roles/role.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PageAccessGuard } from '../../common/guards/page-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([PageAccessEntity, UserRole, Role]),
    SubscriptionsModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, PageAccessGuard],
  exports: [SettingsService, PageAccessGuard],
})
export class SettingsModule {}
