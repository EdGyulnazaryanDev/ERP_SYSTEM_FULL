import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionItemEntity } from './entities/transaction-item.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      TransactionItemEntity,
      InventoryEntity,
    ]),
    AccountingModule,
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, PdfService, ExcelService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
