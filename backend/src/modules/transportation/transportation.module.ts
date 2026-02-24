import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportationController } from './transportation.controller';
import { TransportationService } from './transportation.service';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { CourierEntity } from './entities/courier.entity';
import { DeliveryRouteEntity } from './entities/delivery-route.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentItemEntity,
      CourierEntity,
      DeliveryRouteEntity,
    ]),
  ],
  controllers: [TransportationController],
  providers: [TransportationService],
  exports: [TransportationService],
})
export class TransportationModule {}
