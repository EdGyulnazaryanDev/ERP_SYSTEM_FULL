import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportationController } from './transportation.controller';
import { TransportationService } from './transportation.service';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { CourierEntity } from './entities/courier.entity';
import { DeliveryRouteEntity } from './entities/delivery-route.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentItemEntity,
      CourierEntity,
      DeliveryRouteEntity,
      InventoryEntity,
    ]),
  ],
  controllers: [TransportationController],
  providers: [TransportationService],
  exports: [TransportationService],
})
export class TransportationModule {}
