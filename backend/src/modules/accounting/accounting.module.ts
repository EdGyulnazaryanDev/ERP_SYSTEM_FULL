import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { FinancialBrainService } from './services/financial-brain.service';
import { SuggestionService } from './services/suggestion.service';
import { MatchingService } from './services/matching.service';
import { RuleEngineService } from './services/rule-engine.service';
import { DashboardService } from './services/dashboard.service';
import { ChartOfAccountEntity } from './entities/chart-of-account.entity';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { JournalEntryLineEntity } from './entities/journal-entry-line.entity';
import { AccountReceivableEntity } from './entities/account-receivable.entity';
import { AccountPayableEntity } from './entities/account-payable.entity';
import { PaymentEntity } from './entities/payment.entity';
import { BankAccountEntity } from './entities/bank-account.entity';
import { BankTransactionEntity } from './entities/bank-transaction.entity';
import { BankReconciliationEntity } from './entities/bank-reconciliation.entity';
import { TaxCodeEntity } from './entities/tax-code.entity';
import { FiscalYearEntity } from './entities/fiscal-year.entity';
import { FiscalPeriodEntity } from './entities/fiscal-period.entity';
import { CustomerEntity } from '../crm/entities/customer.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChartOfAccountEntity,
      JournalEntryEntity,
      JournalEntryLineEntity,
      AccountReceivableEntity,
      AccountPayableEntity,
      PaymentEntity,
      BankAccountEntity,
      BankTransactionEntity,
      BankReconciliationEntity,
      TaxCodeEntity,
      FiscalYearEntity,
      FiscalPeriodEntity,
      CustomerEntity,
      SupplierEntity,
    ]),
  ],
  controllers: [AccountingController],
  providers: [
    AccountingService,
    FinancialBrainService,
    SuggestionService,
    MatchingService,
    RuleEngineService,
    DashboardService,
  ],
  exports: [AccountingService, FinancialBrainService, SuggestionService, MatchingService, RuleEngineService, DashboardService],
})
export class AccountingModule {}
