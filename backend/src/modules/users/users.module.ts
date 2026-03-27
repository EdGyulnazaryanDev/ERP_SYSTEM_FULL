import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { PageAccessEntity } from '../settings/entities/page-access.entity';
import { UserRole } from '../roles/user-role.entity';
import { PageAccessGuard } from '../../common/guards/page-access.guard';
import { MinioModule } from '../../infrastructure/minio/minio.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PageAccessEntity, UserRole]), MinioModule],
  controllers: [UsersController],
  providers: [UsersService, PageAccessGuard],
  exports: [UsersService],
})
export class UsersModule {}
