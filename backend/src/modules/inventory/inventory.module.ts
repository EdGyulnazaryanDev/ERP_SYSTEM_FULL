import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryEntity } from './entities/inventory.entity';
import { PurchaseRequisitionEntity } from '../procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../procurement/entities/purchase-requisition-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryEntity,
      PurchaseRequisitionEntity,
      PurchaseRequisitionItemEntity,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
