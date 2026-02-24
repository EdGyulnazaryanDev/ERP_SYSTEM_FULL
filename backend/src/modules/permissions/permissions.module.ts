import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionsController } from './role-permissions.controller';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { Role } from '../roles/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, RolePermission, Role])],
  controllers: [PermissionsController, RolePermissionsController],
  providers: [PermissionsService, RolePermissionsService],
  exports: [PermissionsService, RolePermissionsService],
})
export class PermissionsModule {}
