import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultRbacSeeder } from './default-rbac.seeder';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
  providers: [DefaultRbacSeeder],
  exports: [DefaultRbacSeeder],
})
export class SeedersModule {}
