import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseEntity } from './entities/warehouse.entity';
import { BinEntity } from './entities/bin.entity';
import { StockMovementEntity } from './entities/stock-movement.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { ShipmentEntity } from '../transportation/entities/shipment.entity';
import { ShipmentItemEntity } from '../transportation/entities/shipment-item.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseEntity,
      BinEntity,
      StockMovementEntity,
      InventoryEntity,
      TransactionEntity,
      TransactionItemEntity,
      ShipmentEntity,
      ShipmentItemEntity,
    ]),
    InventoryModule,
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
