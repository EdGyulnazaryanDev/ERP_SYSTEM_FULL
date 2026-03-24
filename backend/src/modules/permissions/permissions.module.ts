import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionsController } from './role-permissions.controller';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { Role } from '../roles/role.entity';
import { PageAccessEntity } from '../settings/entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RolePermission, Role, PageAccessEntity, UserRole])],
  controllers: [PermissionsController, RolePermissionsController],
  providers: [PermissionsService, RolePermissionsService, PageAccessGuard, TenantSuperAdminGuard],
  exports: [PermissionsService, RolePermissionsService],
})
export class PermissionsModule {}
