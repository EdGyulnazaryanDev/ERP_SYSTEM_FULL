import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { PurchaseRequisitionEntity } from './entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from './entities/purchase-requisition-item.entity';
import { RfqEntity } from './entities/rfq.entity';
import { RfqItemEntity } from './entities/rfq-item.entity';
import { VendorQuoteEntity } from './entities/vendor-quote.entity';
import { VendorQuoteItemEntity } from './entities/vendor-quote-item.entity';
import { PurchaseOrderEntity } from './entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from './entities/purchase-order-item.entity';
import { GoodsReceiptEntity } from './entities/goods-receipt.entity';
import { GoodsReceiptItemEntity } from './entities/goods-receipt-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { TransactionItemEntity } from '../transactions/entities/transaction-item.entity';
import { JournalEntryEntity } from '../accounting/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../accounting/entities/journal-entry-line.entity';
import { TransportationModule } from '../transportation/transportation.module';

@Module({
  imports: [
    TransportationModule,
    TypeOrmModule.forFeature([
      PurchaseRequisitionEntity,
      PurchaseRequisitionItemEntity,
      RfqEntity,
      RfqItemEntity,
      VendorQuoteEntity,
      VendorQuoteItemEntity,
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      GoodsReceiptEntity,
      GoodsReceiptItemEntity,
      InventoryEntity,
      TransactionEntity,
      TransactionItemEntity,
      JournalEntryEntity,
      JournalEntryLineEntity,
    ]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
