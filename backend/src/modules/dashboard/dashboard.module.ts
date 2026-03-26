import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { User } from '../users/user.entity';
import { AuditLogEntity } from '../compliance-audit/entities/audit-log.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity, InventoryEntity, ProductEntity, User, AuditLogEntity]),
    SubscriptionsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
