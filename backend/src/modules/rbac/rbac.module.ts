import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { Role } from '../roles/role.entity';
import { Permission } from '../permissions/permission.entity';
import { RolePermission } from '../permissions/role-permission.entity';
import { PageAccessEntity } from '../settings/entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { TenantSuperAdminGuard } from '../../common/guards/tenant-superadmin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, PageAccessEntity, UserRole])],
  controllers: [RbacController],
  providers: [RbacService, PageAccessGuard, TenantSuperAdminGuard],
  exports: [RbacService],
})
export class RbacModule {}
