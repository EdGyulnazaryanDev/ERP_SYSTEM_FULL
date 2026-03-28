import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChartOfAccountEntity,
  AccountType,
  AccountSubType,
} from '../../modules/accounting/entities/chart-of-account.entity';

interface CoaTemplate {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  account_sub_type: AccountSubType;
  description?: string;
  is_system_account: boolean;
}

const DEFAULT_COA: CoaTemplate[] = [
  // ── Assets ──────────────────────────────────────────────────────────────
  { account_code: '1010', account_name: 'Cash on Hand',         account_type: AccountType.ASSET,   account_sub_type: AccountSubType.CASH,               is_system_account: true },
  { account_code: '1020', account_name: 'Bank Account',         account_type: AccountType.ASSET,   account_sub_type: AccountSubType.BANK,               is_system_account: true },
  { account_code: '1100', account_name: 'Accounts Receivable',  account_type: AccountType.ASSET,   account_sub_type: AccountSubType.ACCOUNTS_RECEIVABLE, is_system_account: true },
  { account_code: '1200', account_name: 'Inventory',            account_type: AccountType.ASSET,   account_sub_type: AccountSubType.INVENTORY,          is_system_account: true },
  { account_code: '1500', account_name: 'Fixed Assets',         account_type: AccountType.ASSET,   account_sub_type: AccountSubType.FIXED_ASSET,        is_system_account: false },

  // ── Liabilities ──────────────────────────────────────────────────────────
  { account_code: '2100', account_name: 'Accounts Payable',     account_type: AccountType.LIABILITY, account_sub_type: AccountSubType.ACCOUNTS_PAYABLE,  is_system_account: true },
  { account_code: '2200', account_name: 'Current Liabilities',  account_type: AccountType.LIABILITY, account_sub_type: AccountSubType.CURRENT_LIABILITY, is_system_account: false },

  // ── Equity ───────────────────────────────────────────────────────────────
  { account_code: '3100', account_name: "Owner's Capital",      account_type: AccountType.EQUITY,  account_sub_type: AccountSubType.CAPITAL,            is_system_account: false },
  { account_code: '3200', account_name: 'Retained Earnings',    account_type: AccountType.EQUITY,  account_sub_type: AccountSubType.RETAINED_EARNINGS,  is_system_account: true },

  // ── Revenue ──────────────────────────────────────────────────────────────
  { account_code: '4100', account_name: 'Sales Revenue',        account_type: AccountType.REVENUE, account_sub_type: AccountSubType.SALES_REVENUE,      is_system_account: true },
  { account_code: '4200', account_name: 'Service Revenue',      account_type: AccountType.REVENUE, account_sub_type: AccountSubType.SERVICE_REVENUE,    is_system_account: false },

  // ── Expenses ─────────────────────────────────────────────────────────────
  { account_code: '5100', account_name: 'Cost of Goods Sold',   account_type: AccountType.EXPENSE, account_sub_type: AccountSubType.COST_OF_GOODS_SOLD, is_system_account: true },
  { account_code: '6100', account_name: 'Operating Expenses',   account_type: AccountType.EXPENSE, account_sub_type: AccountSubType.OPERATING_EXPENSE,  is_system_account: false },
  { account_code: '6200', account_name: 'Administrative Expenses', account_type: AccountType.EXPENSE, account_sub_type: AccountSubType.ADMINISTRATIVE_EXPENSE, is_system_account: false },
];

@Injectable()
export class DefaultCoaSeeder {
  private readonly logger = new Logger(DefaultCoaSeeder.name);

  constructor(
    @InjectRepository(ChartOfAccountEntity)
    private readonly coaRepo: Repository<ChartOfAccountEntity>,
  ) {}

  async seed(tenantId: string): Promise<void> {
    let created = 0;
    for (const tpl of DEFAULT_COA) {
      const existing = await this.coaRepo.findOne({
        where: { tenant_id: tenantId, account_sub_type: tpl.account_sub_type as any },
      });
      if (!existing) {
        await this.coaRepo.save(
          this.coaRepo.create({ ...tpl, tenant_id: tenantId, is_active: false }),
        );
        created++;
      }
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} default CoA accounts for tenant ${tenantId}`);
    } else {
      this.logger.log(`CoA already complete for tenant ${tenantId}`);
    }
  }
}
