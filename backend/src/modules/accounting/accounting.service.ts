import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChartOfAccountEntity } from './entities/chart-of-account.entity';
import { JournalEntryEntity, JournalEntryStatus } from './entities/journal-entry.entity';
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
import type {
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
} from './dto/create-chart-of-account.dto';
import type {
  CreateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
} from './dto/create-journal-entry.dto';
import type {
  CreateAccountReceivableDto,
  CreateAccountPayableDto,
  RecordPaymentDto,
} from './dto/create-ar-ap.dto';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/create-bank-account.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(ChartOfAccountEntity)
    private coaRepo: Repository<ChartOfAccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private journalEntryRepo: Repository<JournalEntryEntity>,
    @InjectRepository(JournalEntryLineEntity)
    private journalLineRepo: Repository<JournalEntryLineEntity>,
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(BankAccountEntity)
    private bankAccountRepo: Repository<BankAccountEntity>,
    @InjectRepository(BankTransactionEntity)
    private bankTransactionRepo: Repository<BankTransactionEntity>,
    @InjectRepository(BankReconciliationEntity)
    private bankReconciliationRepo: Repository<BankReconciliationEntity>,
    @InjectRepository(TaxCodeEntity)
    private taxCodeRepo: Repository<TaxCodeEntity>,
    @InjectRepository(FiscalYearEntity)
    private fiscalYearRepo: Repository<FiscalYearEntity>,
    @InjectRepository(FiscalPeriodEntity)
    private fiscalPeriodRepo: Repository<FiscalPeriodEntity>,
  ) {}

  // ==================== CHART OF ACCOUNTS METHODS ====================

  async createAccount(
    data: CreateChartOfAccountDto,
    tenantId: string,
  ): Promise<ChartOfAccountEntity> {
    const existing = await this.coaRepo.findOne({
      where: { account_code: data.account_code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Account code already exists');
    }

    const account = this.coaRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.coaRepo.save(account);
  }

  async getAccounts(tenantId: string): Promise<ChartOfAccountEntity[]> {
    return this.coaRepo.find({
      where: { tenant_id: tenantId },
      order: { account_code: 'ASC' },
    });
  }

  async getAccount(
    id: string,
    tenantId: string,
  ): Promise<ChartOfAccountEntity> {
    const account = await this.coaRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async updateAccount(
    id: string,
    data: UpdateChartOfAccountDto,
    tenantId: string,
  ): Promise<ChartOfAccountEntity> {
    const account = await this.getAccount(id, tenantId);
    Object.assign(account, data);
    return this.coaRepo.save(account);
  }

  async deleteAccount(id: string, tenantId: string): Promise<void> {
    const account = await this.getAccount(id, tenantId);

    const hasTransactions = await this.journalLineRepo.count({
      where: { account_id: id, tenant_id: tenantId },
    });

    if (hasTransactions > 0) {
      throw new BadRequestException(
        'Cannot delete account with transactions',
      );
    }

    await this.coaRepo.remove(account);
  }

  // ==================== JOURNAL ENTRY METHODS ====================

  async createJournalEntry(
    data: CreateJournalEntryDto,
    tenantId: string,
  ): Promise<JournalEntryEntity> {
    // Validate double-entry
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + Number(line.debit),
      0,
    );
    const totalCredit = data.lines.reduce(
      (sum, line) => sum + Number(line.credit),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        'Debits and credits must be equal in double-entry bookkeeping',
      );
    }

    // Validate each line has either debit or credit, not both
    for (const line of data.lines) {
      if (
        (Number(line.debit) > 0 && Number(line.credit) > 0) ||
        (Number(line.debit) === 0 && Number(line.credit) === 0)
      ) {
        throw new BadRequestException(
          'Each line must have either debit or credit, not both or neither',
        );
      }
    }

    // Generate entry number
    const count = await this.journalEntryRepo.count({
      where: { tenant_id: tenantId },
    });
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const entry = this.journalEntryRepo.create({
      ...data,
      entry_number: entryNumber,
      total_debit: totalDebit,
      total_credit: totalCredit,
      tenant_id: tenantId,
    });

    const savedEntry = await this.journalEntryRepo.save(entry);

    // Create lines
    for (let i = 0; i < data.lines.length; i++) {
      const lineData = data.lines[i];
      const line = this.journalLineRepo.create({
        ...lineData,
        journal_entry_id: savedEntry.id,
        line_number: i + 1,
        tenant_id: tenantId,
      });
      await this.journalLineRepo.save(line);
    }

    return this.getJournalEntry(savedEntry.id, tenantId);
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntryEntity[]> {
    return this.journalEntryRepo.find({
      where: { tenant_id: tenantId },
      relations: ['lines', 'lines.account'],
      order: { entry_date: 'DESC' },
    });
  }

  async getJournalEntry(
    id: string,
    tenantId: string,
  ): Promise<JournalEntryEntity> {
    const entry = await this.journalEntryRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['lines', 'lines.account'],
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  async postJournalEntry(
    id: string,
    data: PostJournalEntryDto,
    tenantId: string,
  ): Promise<JournalEntryEntity> {
    const entry = await this.getJournalEntry(id, tenantId);

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException('Only draft entries can be posted');
    }

    entry.status = JournalEntryStatus.POSTED;
    entry.posted_by = data.posted_by;
    entry.posted_at = new Date();

    // Update account balances
    for (const line of entry.lines) {
      const account = await this.getAccount(line.account_id, tenantId);
      const debitAmount = Number(line.debit);
      const creditAmount = Number(line.credit);

      // Update balance based on account type
      if (
        account.account_type === 'asset' ||
        account.account_type === 'expense'
      ) {
        account.current_balance =
          Number(account.current_balance) + debitAmount - creditAmount;
      } else {
        account.current_balance =
          Number(account.current_balance) + creditAmount - debitAmount;
      }

      await this.coaRepo.save(account);
    }

    return this.journalEntryRepo.save(entry);
  }

  async reverseJournalEntry(
    id: string,
    data: ReverseJournalEntryDto,
    tenantId: string,
  ): Promise<JournalEntryEntity> {
    const originalEntry = await this.getJournalEntry(id, tenantId);

    if (originalEntry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException('Only posted entries can be reversed');
    }

    // Create reversal entry
    const reversalLines = originalEntry.lines.map((line) => ({
      account_id: line.account_id,
      description: `Reversal: ${line.description || ''}`,
      debit: line.credit,
      credit: line.debit,
      reference: line.reference,
    }));

    const reversalEntry = await this.createJournalEntry(
      {
        entry_date: data.reversal_date,
        entry_type: originalEntry.entry_type,
        reference: originalEntry.reference,
        description: `Reversal of ${originalEntry.entry_number}: ${data.reason || ''}`,
        lines: reversalLines,
        created_by: data.reversed_by,
      },
      tenantId,
    );

    // Auto-post the reversal
    await this.postJournalEntry(
      reversalEntry.id,
      { posted_by: data.reversed_by },
      tenantId,
    );

    // Mark original as reversed
    originalEntry.status = JournalEntryStatus.REVERSED;
    originalEntry.reversed_entry_id = reversalEntry.id;
    await this.journalEntryRepo.save(originalEntry);

    return reversalEntry;
  }

  // ==================== ACCOUNTS RECEIVABLE METHODS ====================

  async createAR(
    data: CreateAccountReceivableDto,
    tenantId: string,
  ): Promise<AccountReceivableEntity> {
    const existing = await this.arRepo.findOne({
      where: { invoice_number: data.invoice_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Invoice number already exists');
    }

    const ar = this.arRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.arRepo.save(ar);
  }

  async getARList(tenantId: string): Promise<AccountReceivableEntity[]> {
    return this.arRepo.find({
      where: { tenant_id: tenantId },
      order: { invoice_date: 'DESC' },
    });
  }

  async getAR(id: string, tenantId: string): Promise<AccountReceivableEntity> {
    const ar = await this.arRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!ar) {
      throw new NotFoundException('Account receivable not found');
    }

    return ar;
  }

  async recordARPayment(
    id: string,
    data: RecordPaymentDto,
    tenantId: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    const newPaidAmount =
      Number(ar.paid_amount) + Number(data.payment_amount);

    if (newPaidAmount > Number(ar.total_amount)) {
      throw new BadRequestException('Payment exceeds invoice amount');
    }

    ar.paid_amount = newPaidAmount;
    ar.balance_amount = Number(ar.total_amount) - newPaidAmount;

    if (ar.balance_amount === 0) {
      ar.status = 'paid' as any;
    } else {
      ar.status = 'partially_paid' as any;
    }

    return this.arRepo.save(ar);
  }

  // ==================== ACCOUNTS PAYABLE METHODS ====================

  async createAP(
    data: CreateAccountPayableDto,
    tenantId: string,
  ): Promise<AccountPayableEntity> {
    const existing = await this.apRepo.findOne({
      where: { bill_number: data.bill_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Bill number already exists');
    }

    const ap = this.apRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.apRepo.save(ap);
  }

  async getAPList(tenantId: string): Promise<AccountPayableEntity[]> {
    return this.apRepo.find({
      where: { tenant_id: tenantId },
      order: { bill_date: 'DESC' },
    });
  }

  async getAP(id: string, tenantId: string): Promise<AccountPayableEntity> {
    const ap = await this.apRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!ap) {
      throw new NotFoundException('Account payable not found');
    }

    return ap;
  }

  async recordAPPayment(
    id: string,
    data: RecordPaymentDto,
    tenantId: string,
  ): Promise<AccountPayableEntity> {
    const ap = await this.getAP(id, tenantId);

    const newPaidAmount =
      Number(ap.paid_amount) + Number(data.payment_amount);

    if (newPaidAmount > Number(ap.total_amount)) {
      throw new BadRequestException('Payment exceeds bill amount');
    }

    ap.paid_amount = newPaidAmount;
    ap.balance_amount = Number(ap.total_amount) - newPaidAmount;

    if (ap.balance_amount === 0) {
      ap.status = 'paid' as any;
    } else {
      ap.status = 'partially_paid' as any;
    }

    return this.apRepo.save(ap);
  }

  // ==================== PAYMENT METHODS ====================

  async createPayment(
    data: CreatePaymentDto,
    tenantId: string,
  ): Promise<PaymentEntity> {
    // Generate payment number
    const count = await this.paymentRepo.count({
      where: { tenant_id: tenantId },
    });
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const payment = this.paymentRepo.create({
      ...data,
      payment_number: paymentNumber,
      tenant_id: tenantId,
    });

    return this.paymentRepo.save(payment);
  }

  async getPayments(tenantId: string): Promise<PaymentEntity[]> {
    return this.paymentRepo.find({
      where: { tenant_id: tenantId },
      order: { payment_date: 'DESC' },
    });
  }

  async getPayment(id: string, tenantId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // ==================== BANK ACCOUNT METHODS ====================

  async createBankAccount(
    data: CreateBankAccountDto,
    tenantId: string,
  ): Promise<BankAccountEntity> {
    const existing = await this.bankAccountRepo.findOne({
      where: { account_number: data.account_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Bank account number already exists');
    }

    const bankAccount = this.bankAccountRepo.create({
      ...data,
      current_balance: data.opening_balance || 0,
      tenant_id: tenantId,
    });

    return this.bankAccountRepo.save(bankAccount);
  }

  async getBankAccounts(tenantId: string): Promise<BankAccountEntity[]> {
    return this.bankAccountRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { account_name: 'ASC' },
    });
  }

  async getBankAccount(
    id: string,
    tenantId: string,
  ): Promise<BankAccountEntity> {
    const account = await this.bankAccountRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  async updateBankAccount(
    id: string,
    data: UpdateBankAccountDto,
    tenantId: string,
  ): Promise<BankAccountEntity> {
    const account = await this.getBankAccount(id, tenantId);
    Object.assign(account, data);
    return this.bankAccountRepo.save(account);
  }

  // ==================== REPORTING METHODS ====================

  async getTrialBalance(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const accounts = await this.getAccounts(tenantId);

    const trialBalance = accounts.map((account) => ({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      debit: Number(account.current_balance) >= 0 ? account.current_balance : 0,
      credit:
        Number(account.current_balance) < 0
          ? Math.abs(Number(account.current_balance))
          : 0,
    }));

    const totalDebit = trialBalance.reduce(
      (sum, acc) => sum + Number(acc.debit),
      0,
    );
    const totalCredit = trialBalance.reduce(
      (sum, acc) => sum + Number(acc.credit),
      0,
    );

    return {
      accounts: trialBalance,
      total_debit: totalDebit,
      total_credit: totalCredit,
      difference: totalDebit - totalCredit,
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate?: string): Promise<any> {
    const accounts = await this.getAccounts(tenantId);

    const assets = accounts.filter((a) => a.account_type === 'asset');
    const liabilities = accounts.filter((a) => a.account_type === 'liability');
    const equity = accounts.filter((a) => a.account_type === 'equity');

    const totalAssets = assets.reduce(
      (sum, a) => sum + Number(a.current_balance),
      0,
    );
    const totalLiabilities = liabilities.reduce(
      (sum, a) => sum + Number(a.current_balance),
      0,
    );
    const totalEquity = equity.reduce(
      (sum, a) => sum + Number(a.current_balance),
      0,
    );

    return {
      as_of_date: asOfDate || new Date().toISOString().split('T')[0],
      assets: {
        accounts: assets.map((a) => ({
          code: a.account_code,
          name: a.account_name,
          balance: a.current_balance,
        })),
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities.map((a) => ({
          code: a.account_code,
          name: a.account_name,
          balance: a.current_balance,
        })),
        total: totalLiabilities,
      },
      equity: {
        accounts: equity.map((a) => ({
          code: a.account_code,
          name: a.account_name,
          balance: a.current_balance,
        })),
        total: totalEquity,
      },
      total_liabilities_and_equity: totalLiabilities + totalEquity,
    };
  }

  async getProfitAndLoss(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const accounts = await this.getAccounts(tenantId);

    const revenue = accounts.filter((a) => a.account_type === 'revenue');
    const expenses = accounts.filter((a) => a.account_type === 'expense');

    const totalRevenue = revenue.reduce(
      (sum, a) => sum + Number(a.current_balance),
      0,
    );
    const totalExpenses = expenses.reduce(
      (sum, a) => sum + Number(a.current_balance),
      0,
    );

    return {
      period: { start_date: startDate, end_date: endDate },
      revenue: {
        accounts: revenue.map((a) => ({
          code: a.account_code,
          name: a.account_name,
          balance: a.current_balance,
        })),
        total: totalRevenue,
      },
      expenses: {
        accounts: expenses.map((a) => ({
          code: a.account_code,
          name: a.account_name,
          balance: a.current_balance,
        })),
        total: totalExpenses,
      },
      net_profit: totalRevenue - totalExpenses,
    };
  }
}
