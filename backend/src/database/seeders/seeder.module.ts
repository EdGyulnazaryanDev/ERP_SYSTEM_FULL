import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprehensiveSeeder } from './comprehensive.seeder';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { InventoryEntity } from '../../modules/inventory/entities/inventory.entity';
import { SettingsModule } from '../../modules/settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      CategoryEntity,
      InventoryEntity,
    ]),
    SettingsModule,
  ],
  providers: [ComprehensiveSeeder],
  exports: [ComprehensiveSeeder],
})
export class SeederModule {}
