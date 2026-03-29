import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChartOfAccountEntity } from './entities/chart-of-account.entity';
import { JournalEntryEntity, JournalEntryStatus, JournalEntryType } from './entities/journal-entry.entity';
import { JournalEntryLineEntity } from './entities/journal-entry-line.entity';
import {
  AccountReceivableEntity,
  ARAcknowledgementStatus,
  ARApprovalStatus,
  ARPostingStatus,
  ARStatus,
} from './entities/account-receivable.entity';
import { AccountPayableEntity } from './entities/account-payable.entity';
import { PaymentEntity } from './entities/payment.entity';
import { BankAccountEntity } from './entities/bank-account.entity';
import { BankAccountType } from './entities/bank-account.entity';
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
  ReviewAccountReceivableDto,
  SignAccountReceivableDto,
} from './dto/create-ar-ap.dto';
import type { CreatePaymentDto } from './dto/create-payment.dto';
import type {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/create-bank-account.dto';
import { CustomerEntity } from '../crm/entities/customer.entity';
import { RedisService } from '../../infrastructure/redis/redis.service';

const TTL_COA = 300; // 5 min

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
    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,
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
    private readonly redis: RedisService,
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

    try {
      const account = this.coaRepo.create({
        ...data,
        tenant_id: tenantId,
      });

      const saved = await this.coaRepo.save(account);
      await this.redis.delPattern(`coa:${tenantId}:*`);
      await this.redis.del(`coa_all:${tenantId}`);
      return saved;
    } catch (e) {
      console.error('SERVICE LEVEL ACCOUNT CREATION ERROR:', e);
      throw e;
    }
  }

  async getAccounts(
    tenantId: string,
    page = 1,
    limit = 200,
  ): Promise<{ data: ChartOfAccountEntity[]; total: number; page: number; limit: number }> {
    // For CoA, default limit is high (200) since it's used in dropdowns too
    const p = Math.max(1, page);
    const l = Math.min(500, Math.max(1, limit));
    const cacheKey = `coa:${tenantId}:${p}:${l}`;
    return this.redis.cached(cacheKey, TTL_COA, async () => {
      const [data, total] = await this.coaRepo.findAndCount({
        where: { tenant_id: tenantId },
        order: { account_code: 'ASC' },
        skip: (p - 1) * l,
        take: l,
      });
      return { data, total, page: p, limit: l };
    });
  }

  /** Internal use only — returns all accounts as a flat array (no pagination) */
  private async getAllAccountsRaw(tenantId: string): Promise<ChartOfAccountEntity[]> {
    return this.redis.cached(`coa_all:${tenantId}`, TTL_COA, () =>
      this.coaRepo.find({ where: { tenant_id: tenantId }, order: { account_code: 'ASC' } }),
    );
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
    const saved = await this.coaRepo.save(account);
    await this.redis.delPattern(`coa:${tenantId}:*`);
    return saved;
  }

  async deleteAccount(id: string, tenantId: string): Promise<void> {
    const account = await this.getAccount(id, tenantId);

    const hasTransactions = await this.journalLineRepo.count({
      where: { account_id: id, tenant_id: tenantId },
    });

    if (hasTransactions > 0) {
      throw new BadRequestException('Cannot delete account with transactions');
    }

    await this.coaRepo.remove(account);
    await this.redis.delPattern(`coa:${tenantId}:*`);
    await this.redis.del(`coa_all:${tenantId}`);
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

    const { lines, ...entryData } = data;
    const entry = this.journalEntryRepo.create({
      ...entryData,
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

  async findJournalEntriesByReference(
    reference: string,
    tenantId: string,
  ): Promise<JournalEntryEntity[]> {
    return this.journalEntryRepo.find({
      where: { tenant_id: tenantId, reference },
      relations: ['lines', 'lines.account'],
      order: { created_at: 'ASC' },
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
    if (data.posted_by) entry.posted_by = data.posted_by;
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

    const saved = await this.journalEntryRepo.save(entry);
    // Balances changed — invalidate CoA cache
    await this.redis.delPattern(`coa:${tenantId}:*`);
    await this.redis.del(`coa_all:${tenantId}`);
    return saved;
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

  // ==================== HELPER: find default account by subtype ====================

  private async findDefaultAccount(
    tenantId: string,
    subType: string,
    p0?: any,
  ): Promise<ChartOfAccountEntity | null> {
    return this.coaRepo.findOne({
      where: {
        tenant_id: tenantId,
        account_sub_type: subType as any,
        is_active: true,
      },
      order: { account_code: 'ASC' },
    });
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

    const dueDate = data.due_date
      ? data.due_date
      : await this.deriveCustomerDueDate(data.customer_id, data.invoice_date, tenantId);

    const ar = this.arRepo.create({
      ...data,
      due_date: dueDate,
      total_amount: data.amount,
      balance_amount: data.amount - (data.paid_amount || 0),
      tenant_id: tenantId,
      status:
        Number(data.paid_amount || 0) >= Number(data.amount)
          ? ARStatus.PAID
          : Number(data.paid_amount || 0) > 0
            ? ARStatus.PARTIALLY_PAID
            : ARStatus.OPEN,
      approval_status: data.initial_approval_status || ARApprovalStatus.DRAFT,
      posting_status: ARPostingStatus.UNPOSTED,
      acknowledgement_status: ARAcknowledgementStatus.PENDING,
    });

    const savedAR = await this.arRepo.save(ar);

    try {
      const je = await this.ensureInvoiceDraftJournalEntry(savedAR, tenantId, data);
      if (je && savedAR.journal_entry_id !== je.id) {
        savedAR.journal_entry_id = je.id;
        await this.arRepo.save(savedAR);
      }
    } catch (e) {
      console.warn('Could not auto-create journal entry for AR:', e.message);
    }

    return savedAR;
  }

  async getARList(tenantId: string): Promise<any[]> {
    const rows = await this.arRepo
      .createQueryBuilder('ar')
      .leftJoin('customers', 'c', 'c.id = ar.customer_id')
      .addSelect([
        'ar.id', 'ar.invoice_number', 'ar.customer_id',
        'ar.invoice_date', 'ar.due_date',
        'ar.total_amount', 'ar.paid_amount', 'ar.balance_amount',
        'ar.status', 'ar.approval_status', 'ar.posting_status',
        'ar.acknowledgement_status', 'ar.reference', 'ar.description',
        'ar.journal_entry_id', 'ar.created_at', 'ar.updated_at',
        'ar.approved_at', 'ar.posted_at', 'ar.signed_at', 'ar.signed_by_name',
      ])
      .addSelect(
        `COALESCE(NULLIF(c.company_name, ''), c.contact_person)`,
        'customer_name',
      )
      .where('ar.tenant_id = :tenantId', { tenantId })
      .orderBy('ar.invoice_date', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      id: r.ar_id,
      invoice_number: r.ar_invoice_number,
      customer_id: r.ar_customer_id,
      customer_name: (r.customer_name || '').trim() || r.ar_customer_id,
      invoice_date: r.ar_invoice_date,
      due_date: r.ar_due_date,
      total_amount: r.ar_total_amount,
      paid_amount: r.ar_paid_amount,
      balance_amount: r.ar_balance_amount,
      status: r.ar_status,
      approval_status: r.ar_approval_status,
      posting_status: r.ar_posting_status,
      acknowledgement_status: r.ar_acknowledgement_status,
      reference: r.ar_reference,
      description: r.ar_description,
      journal_entry_id: r.ar_journal_entry_id,
      approved_at: r.ar_approved_at,
      posted_at: r.ar_posted_at,
      signed_at: r.ar_signed_at,
      signed_by_name: r.ar_signed_by_name,
      created_at: r.ar_created_at,
      updated_at: r.ar_updated_at,
    }));
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

  async submitAR(id: string, tenantId: string): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (ar.approval_status !== ARApprovalStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be submitted for approval');
    }

    ar.approval_status = ARApprovalStatus.PENDING_APPROVAL;
    return this.arRepo.save(ar);
  }

  async approveAR(
    id: string,
    data: ReviewAccountReceivableDto,
    tenantId: string,
    userId?: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (
      ![ARApprovalStatus.DRAFT, ARApprovalStatus.PENDING_APPROVAL].includes(
        ar.approval_status,
      )
    ) {
      throw new BadRequestException('Invoice is not awaiting approval');
    }

    await this.ensureInvoiceDraftJournalEntry(ar, tenantId);

    ar.approval_status = ARApprovalStatus.APPROVED;
    ar.approved_at = new Date();
    ar.approved_by = (userId || undefined) as any;
    ar.approval_notes = (data.notes || undefined) as any;
    return this.arRepo.save(ar);
  }

  async rejectAR(
    id: string,
    data: ReviewAccountReceivableDto,
    tenantId: string,
    _userId?: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (ar.posting_status === ARPostingStatus.POSTED) {
      throw new BadRequestException('Posted invoices cannot be rejected. Reverse the journal entry instead.');
    }

    ar.approval_status = ARApprovalStatus.REJECTED;
    ar.status = ARStatus.REJECTED;
    ar.approval_notes = (data.notes || undefined) as any;
    ar.acknowledgement_status = ARAcknowledgementStatus.PENDING;

    if (ar.journal_entry_id) {
      await this.deleteDraftJournalEntry(ar.journal_entry_id, tenantId);
      ar.journal_entry_id = null as any;
    }

    return this.arRepo.save(ar);
  }

  async postAR(
    id: string,
    tenantId: string,
    userId?: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (ar.approval_status !== ARApprovalStatus.APPROVED) {
      throw new BadRequestException('Only approved invoices can be posted');
    }

    if (ar.posting_status === ARPostingStatus.POSTED) {
      throw new BadRequestException('Invoice already posted');
    }

    const journalEntry = await this.ensureInvoiceDraftJournalEntry(ar, tenantId);
    if (!journalEntry) {
      throw new BadRequestException('No draft journal entry available for posting');
    }

    if (journalEntry.status !== JournalEntryStatus.POSTED) {
      await this.postJournalEntry(
        journalEntry.id,
        { posted_by: userId },
        tenantId,
      );
    }

    ar.posting_status = ARPostingStatus.POSTED;
    ar.posted_at = new Date();
    ar.posted_by = (userId || undefined) as any;
    ar.status = this.computeReceivableCollectionStatus(ar);

    return this.arRepo.save(ar);
  }

  async signAR(
    id: string,
    data: SignAccountReceivableDto,
    tenantId: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (ar.posting_status !== ARPostingStatus.POSTED) {
      throw new BadRequestException('Only posted invoices can be signed');
    }

    ar.acknowledgement_status = ARAcknowledgementStatus.SIGNED;
    ar.signed_by_name = data.signed_by_name;
    ar.signed_at = new Date();
    ar.signing_notes = (data.notes || undefined) as any;
    return this.arRepo.save(ar);
  }

  async recordARPayment(
    id: string,
    data: RecordPaymentDto,
    tenantId: string,
  ): Promise<AccountReceivableEntity> {
    const ar = await this.getAR(id, tenantId);

    if (ar.posting_status !== ARPostingStatus.POSTED) {
      throw new BadRequestException('Payments can be recorded only after the invoice is posted');
    }

    const newPaidAmount = Number(ar.paid_amount) + Number(data.payment_amount);

    if (newPaidAmount > Number(ar.total_amount)) {
      throw new BadRequestException('Payment exceeds invoice amount');
    }

    ar.paid_amount = newPaidAmount;
    ar.balance_amount = Number(ar.total_amount) - newPaidAmount;
    ar.status = this.computeReceivableCollectionStatus(ar);

    const savedAR = await this.arRepo.save(ar);

    // Auto-create journal entry: Debit Bank/Cash, Credit AR
    try {
      const bankAccount = data.bank_account_id
        ? await this.getAccount(data.bank_account_id, tenantId)
        : (await this.findDefaultAccount(tenantId, 'bank')) ||
          (await this.findDefaultAccount(tenantId, 'cash'));

      const arAccount = await this.findDefaultAccount(
        tenantId,
        'accounts_receivable',
      );

      if (bankAccount && arAccount) {
        const je = await this.createJournalEntry(
          {
            entry_date: data.payment_date,
            entry_type: JournalEntryType.RECEIPT,
            description: `Payment received for invoice ${ar.invoice_number}`,
            reference: data.reference || ar.invoice_number,
            lines: [
              {
                account_id: bankAccount.id,
                description: `Payment - ${ar.invoice_number}`,
                debit: data.payment_amount,
                credit: 0,
              },
              {
                account_id: arAccount.id,
                description: `AR cleared - ${ar.invoice_number}`,
                debit: 0,
                credit: data.payment_amount,
              },
            ],
          },
          tenantId,
        );
        await this.postJournalEntry(je.id, {}, tenantId);
      }
    } catch (e) {
      console.warn(
        'Could not auto-create journal entry for AR payment:',
        e.message,
      );
    }

    return savedAR;
  }

  private async deriveCustomerDueDate(
    customerId: string,
    invoiceDate: string,
    tenantId: string,
  ): Promise<string> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId, tenant_id: tenantId },
    });

    const baseDate = new Date(invoiceDate);
    const paymentTerms = Number(customer?.payment_terms || 30);
    baseDate.setDate(baseDate.getDate() + paymentTerms);
    return baseDate.toISOString().split('T')[0];
  }

  private async ensureInvoiceDraftJournalEntry(
    ar: AccountReceivableEntity,
    tenantId: string,
    data?: Partial<CreateAccountReceivableDto>,
  ): Promise<JournalEntryEntity | null> {
    if (ar.journal_entry_id) {
      return this.getJournalEntry(ar.journal_entry_id, tenantId);
    }

    const arAccount = data?.ar_account_id
      ? await this.getAccount(data.ar_account_id, tenantId)
      : await this.findDefaultAccount(tenantId, 'accounts_receivable');

    const revenueAccount = data?.revenue_account_id
      ? await this.getAccount(data.revenue_account_id, tenantId)
      : (await this.findDefaultAccount(tenantId, 'sales_revenue')) ||
        (await this.findDefaultAccount(tenantId, 'service_revenue'));

    if (!arAccount || !revenueAccount) {
      return null;
    }

    const journalEntry = await this.createJournalEntry(
      {
        entry_date: new Date(ar.invoice_date).toISOString().split('T')[0],
        entry_type: JournalEntryType.SALES,
        description: `Invoice ${ar.invoice_number}${ar.description ? ': ' + ar.description : ''}`,
        reference: ar.invoice_number,
        lines: [
          {
            account_id: arAccount.id,
            description: `AR - ${ar.invoice_number}`,
            debit: Number(ar.total_amount),
            credit: 0,
          },
          {
            account_id: revenueAccount.id,
            description: `Revenue - ${ar.invoice_number}`,
            debit: 0,
            credit: Number(ar.total_amount),
          },
        ],
      },
      tenantId,
    );

    ar.journal_entry_id = journalEntry.id;
    await this.arRepo.save(ar);
    return journalEntry;
  }

  private async deleteDraftJournalEntry(
    journalEntryId: string,
    tenantId: string,
  ): Promise<void> {
    const entry = await this.getJournalEntry(journalEntryId, tenantId);

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException('Only draft journal entries can be removed from a rejected invoice');
    }

    await this.journalLineRepo.delete({ journal_entry_id: journalEntryId });
    await this.journalEntryRepo.delete({ id: journalEntryId, tenant_id: tenantId });
  }

  private computeReceivableCollectionStatus(ar: {
    balance_amount: number;
    total_amount?: number;
    due_date: Date | string;
    posting_status?: ARPostingStatus;
  }): ARStatus {
    const balanceAmount = Number(ar.balance_amount || 0);
    const totalAmount = Number(ar.total_amount || 0);

    if (balanceAmount <= 0) {
      return ARStatus.PAID;
    }

    if (ar.posting_status !== ARPostingStatus.POSTED) {
      return ARStatus.OPEN;
    }

    const dueDate = ar.due_date ? new Date(ar.due_date) : null;
    if (dueDate && dueDate.getTime() < new Date().getTime()) {
      return ARStatus.OVERDUE;
    }

    return balanceAmount < totalAmount ? ARStatus.PARTIALLY_PAID : ARStatus.OPEN;
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
      vendor_id: data.supplier_id,
      total_amount: data.amount,
      balance_amount: data.amount - (data.paid_amount || 0),
      tenant_id: tenantId,
    });

    const savedAP = await this.apRepo.save(ap);

    // Auto-create journal entry: Debit Expense, Credit AP account
    try {
      const expenseAccount = data.expense_account_id
        ? await this.getAccount(data.expense_account_id, tenantId)
        : (await this.findDefaultAccount(tenantId, 'operating_expense')) ||
          (await this.findDefaultAccount(tenantId, 'administrative_expense'));

      const apAccount = data.ap_account_id
        ? await this.getAccount(data.ap_account_id, tenantId)
        : await this.findDefaultAccount(tenantId, 'accounts_payable');

      if (expenseAccount && apAccount) {
        const je = await this.createJournalEntry(
          {
            entry_date: data.bill_date,
            entry_type: JournalEntryType.PURCHASE,
            description: `Bill ${data.bill_number}${data.description ? ': ' + data.description : ''}`,
            reference: data.bill_number,
            lines: [
              {
                account_id: expenseAccount.id,
                description: `Expense - ${data.bill_number}`,
                debit: data.amount,
                credit: 0,
              },
              {
                account_id: apAccount.id,
                description: `AP - ${data.bill_number}`,
                debit: 0,
                credit: data.amount,
              },
            ],
          },
          tenantId,
        );
        await this.postJournalEntry(je.id, {}, tenantId);
        savedAP.journal_entry_id = je.id;
        await this.apRepo.save(savedAP);
      }
    } catch (e) {
      console.warn('Could not auto-create journal entry for AP:', e.message);
    }

    return savedAP;
  }

  async getAPList(tenantId: string): Promise<any[]> {
    const rows = await this.apRepo
      .createQueryBuilder('ap')
      .leftJoin('suppliers', 's', 's.id = ap.vendor_id')
      .addSelect([
        'ap.id', 'ap.bill_number', 'ap.vendor_id',
        'ap.bill_date', 'ap.due_date',
        'ap.total_amount', 'ap.paid_amount', 'ap.balance_amount',
        'ap.status', 'ap.notes', 'ap.reference', 'ap.journal_entry_id',
        'ap.created_at', 'ap.updated_at',
      ])
      .addSelect('s.name', 'supplier_name')
      .where('ap.tenant_id = :tenantId', { tenantId })
      .orderBy('ap.bill_date', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      id: r.ap_id,
      bill_number: r.ap_bill_number,
      vendor_id: r.ap_vendor_id,
      supplier_name: (r.supplier_name || '').trim() || r.ap_vendor_id,
      bill_date: r.ap_bill_date,
      due_date: r.ap_due_date,
      total_amount: r.ap_total_amount,
      paid_amount: r.ap_paid_amount,
      balance_amount: r.ap_balance_amount,
      status: r.ap_status,
      notes: r.ap_notes,
      reference: r.ap_reference,
      journal_entry_id: r.ap_journal_entry_id,
      created_at: r.ap_created_at,
      updated_at: r.ap_updated_at,
    }));
  }

  async getAP(id: string, tenantId: string): Promise<AccountPayableEntity> {
    const ap = await this.apRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['supplier'],
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

    const newPaidAmount = Number(ap.paid_amount) + Number(data.payment_amount);

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

    const savedAP = await this.apRepo.save(ap);

    // Auto-create journal entry: Debit AP account, Credit Bank/Cash
    try {
      const apAccount = data.bank_account_id
        ? null
        : await this.findDefaultAccount(tenantId, 'accounts_payable');

      const bankAccount = data.bank_account_id
        ? await this.getAccount(data.bank_account_id, tenantId)
        : (await this.findDefaultAccount(tenantId, 'bank')) ||
          (await this.findDefaultAccount(tenantId, 'cash'));

      const apCoaAccount = await this.findDefaultAccount(
        tenantId,
        'accounts_payable',
      );

      if (apCoaAccount && bankAccount) {
        const je = await this.createJournalEntry(
          {
            entry_date: data.payment_date,
            entry_type: JournalEntryType.PAYMENT,
            description: `Payment for bill ${ap.bill_number}`,
            reference: data.reference || ap.bill_number,
            lines: [
              {
                account_id: apCoaAccount.id,
                description: `AP cleared - ${ap.bill_number}`,
                debit: data.payment_amount,
                credit: 0,
              },
              {
                account_id: bankAccount.id,
                description: `Payment - ${ap.bill_number}`,
                debit: 0,
                credit: data.payment_amount,
              },
            ],
          },
          tenantId,
        );
        await this.postJournalEntry(je.id, {}, tenantId);
      }
    } catch (e) {
      console.warn(
        'Could not auto-create journal entry for AP payment:',
        e.message,
      );
    }

    return savedAP;
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
      account_type: data.account_type || BankAccountType.CHECKING,
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
    const accounts = await this.getAllAccountsRaw(tenantId);

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
    const accounts = await this.getAllAccountsRaw(tenantId);

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
    const accounts = await this.getAllAccountsRaw(tenantId);

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
