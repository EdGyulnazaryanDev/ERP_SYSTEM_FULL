import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportationController } from './transportation.controller';
import { TransportationService } from './transportation.service';
import { ShipmentDocumentService } from './shipment-document.service';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentItemEntity } from './entities/shipment-item.entity';
import { CourierEntity } from './entities/courier.entity';
import { DeliveryRouteEntity } from './entities/delivery-route.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    AccountingModule,
    TypeOrmModule.forFeature([
      ShipmentEntity,
      ShipmentItemEntity,
      CourierEntity,
      DeliveryRouteEntity,
      InventoryEntity,
      TransactionEntity,
    ]),
  ],
  controllers: [TransportationController],
  providers: [TransportationService, ShipmentDocumentService],
  exports: [TransportationService, ShipmentDocumentService, TypeOrmModule],
})
export class TransportationModule {}
