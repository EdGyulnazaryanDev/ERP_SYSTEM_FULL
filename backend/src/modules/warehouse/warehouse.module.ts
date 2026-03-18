import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseEntity } from './entities/warehouse.entity';
import { BinEntity } from './entities/bin.entity';
import { StockMovementEntity } from './entities/stock-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WarehouseEntity, BinEntity, StockMovementEntity]),
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
