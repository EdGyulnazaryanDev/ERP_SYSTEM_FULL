import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryEntity } from './entities/inventory.entity';
import { PurchaseRequisitionEntity } from '../procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../procurement/entities/purchase-requisition-item.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { AccountingModule } from '../accounting/accounting.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AccountingModule,
    SubscriptionsModule,
    TypeOrmModule.forFeature([
      InventoryEntity,
      PurchaseRequisitionEntity,
      PurchaseRequisitionItemEntity,
      TransactionEntity,
      TransactionItemEntity,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
