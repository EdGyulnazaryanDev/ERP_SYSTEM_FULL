import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultRbacSeeder } from './default-rbac.seeder';
import { DefaultCoaSeeder } from './default-coa.seeder';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';
import { ChartOfAccountEntity } from '../../modules/accounting/entities/chart-of-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission, ChartOfAccountEntity])],
  providers: [DefaultRbacSeeder, DefaultCoaSeeder],
  exports: [DefaultRbacSeeder, DefaultCoaSeeder],
})
export class SeedersModule {}
