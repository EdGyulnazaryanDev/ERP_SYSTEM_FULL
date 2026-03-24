import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from './role.entity';
import { UserRole } from './user-role.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { PageAccessEntity } from '../settings/entities/page-access.entity';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, PageAccessEntity]),
    PermissionsModule,
  ],
  controllers: [RolesController],
  providers: [RolesService, PageAccessGuard, TenantSuperAdminGuard],
  exports: [RolesService],
})
export class RolesModule {}
