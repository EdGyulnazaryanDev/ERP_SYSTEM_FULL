import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountReceivableEntity } from '../entities/account-receivable.entity';
import { AccountPayableEntity } from '../entities/account-payable.entity';
import { ChartOfAccountEntity } from '../entities/chart-of-account.entity';
import { JournalEntryEntity } from '../entities/journal-entry.entity';
import { BankAccountEntity } from '../entities/bank-account.entity';

export interface Suggestion {
  id: string;
  type: 'ar' | 'ap' | 'bank' | 'coa' | 'cashflow' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: string;
  data?: any;
}

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
    @InjectRepository(ChartOfAccountEntity)
    private coaRepo: Repository<ChartOfAccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private journalRepo: Repository<JournalEntryEntity>,
    @InjectRepository(BankAccountEntity)
    private bankRepo: Repository<BankAccountEntity>,
  ) {}

  async generateSuggestions(tenantId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const today = new Date();

    // ── AR Suggestions ──────────────────────────────────────────────
    const allAR = await this.arRepo.find({ where: { tenant_id: tenantId } });
    const openAR = allAR.filter(ar => ar.status !== 'paid' as any);

    const overdueAR = openAR.filter(ar => new Date(ar.due_date) < today);
    if (overdueAR.length > 0) {
      const totalOverdue = overdueAR.reduce((s, ar) => s + Number(ar.balance_amount), 0);
      suggestions.push({
        id: 'ar-overdue-summary',
        type: 'ar',
        severity: 'critical',
        title: `${overdueAR.length} overdue invoice(s)`,
        message: `You have ${overdueAR.length} overdue invoice(s) totaling $${totalOverdue.toFixed(2)}. Oldest: ${overdueAR.map(a => a.invoice_number).slice(0, 3).join(', ')}`,
        action: 'Review and send payment reminders',
        data: { count: overdueAR.length, total: totalOverdue },
      });
    }

    // AR due in next 7 days
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonAR = openAR.filter(ar => {
      const due = new Date(ar.due_date);
      return due >= today && due <= in7Days;
    });
    if (dueSoonAR.length > 0) {
      const total = dueSoonAR.reduce((s, ar) => s + Number(ar.balance_amount), 0);
      suggestions.push({
        id: 'ar-due-soon',
        type: 'ar',
        severity: 'warning',
        title: `${dueSoonAR.length} invoice(s) due within 7 days`,
        message: `Expected incoming: $${total.toFixed(2)} from ${dueSoonAR.length} invoice(s)`,
        action: 'Follow up with customers',
        data: { count: dueSoonAR.length, total },
      });
    }

    // ── AP Suggestions ──────────────────────────────────────────────
    const allAP = await this.apRepo.find({ where: { tenant_id: tenantId } });
    const openAP = allAP.filter(ap => ap.status !== 'paid' as any);

    const overdueAP = openAP.filter(ap => new Date(ap.due_date) < today);
    if (overdueAP.length > 0) {
      const total = overdueAP.reduce((s, ap) => s + Number(ap.balance_amount), 0);
      suggestions.push({
        id: 'ap-overdue',
        type: 'ap',
        severity: 'critical',
        title: `${overdueAP.length} overdue bill(s)`,
        message: `You owe $${total.toFixed(2)} on ${overdueAP.length} overdue bill(s). Pay immediately to maintain vendor relationships.`,
        action: 'Schedule payments now',
        data: { count: overdueAP.length, total },
      });
    }

    const dueSoonAP = openAP.filter(ap => {
      const due = new Date(ap.due_date);
      return due >= today && due <= in7Days;
    });
    if (dueSoonAP.length > 0) {
      const total = dueSoonAP.reduce((s, ap) => s + Number(ap.balance_amount), 0);
      suggestions.push({
        id: 'ap-due-soon',
        type: 'ap',
        severity: 'warning',
        title: `$${total.toFixed(2)} in bills due within 7 days`,
        message: `${dueSoonAP.length} bill(s) due soon: ${dueSoonAP.map(a => a.bill_number).slice(0, 3).join(', ')}`,
        action: 'Prepare payments',
        data: { count: dueSoonAP.length, total },
      });
    }

    // ── Cash Flow Suggestion ─────────────────────────────────────────
    const totalARBalance = openAR.reduce((s, ar) => s + Number(ar.balance_amount), 0);
    const totalAPBalance = openAP.reduce((s, ap) => s + Number(ap.balance_amount), 0);
    const netCashFlow = totalARBalance - totalAPBalance;

    if (netCashFlow < 0) {
      suggestions.push({
        id: 'cashflow-negative',
        type: 'cashflow',
        severity: 'critical',
        title: 'Negative cash flow position',
        message: `You owe $${totalAPBalance.toFixed(2)} but are owed $${totalARBalance.toFixed(2)}. Net position: -$${Math.abs(netCashFlow).toFixed(2)}`,
        action: 'Accelerate collections and defer non-critical payments',
        data: { ar: totalARBalance, ap: totalAPBalance, net: netCashFlow },
      });
    } else {
      suggestions.push({
        id: 'cashflow-positive',
        type: 'cashflow',
        severity: 'info',
        title: 'Cash flow overview',
        message: `Receivables: $${totalARBalance.toFixed(2)} | Payables: $${totalAPBalance.toFixed(2)} | Net: +$${netCashFlow.toFixed(2)}`,
        data: { ar: totalARBalance, ap: totalAPBalance, net: netCashFlow },
      });
    }

    // ── CoA Suggestions ─────────────────────────────────────────────
    const accounts = await this.coaRepo.find({ where: { tenant_id: tenantId } });
    const hasARAccount = accounts.some(a => a.account_sub_type === 'accounts_receivable' as any);
    const hasAPAccount = accounts.some(a => a.account_sub_type === 'accounts_payable' as any);
    const hasBankAccount = accounts.some(a => a.account_sub_type === 'bank' as any || a.account_sub_type === 'cash' as any);
    const hasRevenueAccount = accounts.some(a => a.account_type === 'revenue' as any);
    const hasExpenseAccount = accounts.some(a => a.account_type === 'expense' as any);

    const missingAccounts: string[] = [];
    if (!hasARAccount) missingAccounts.push('Accounts Receivable (subtype: accounts_receivable)');
    if (!hasAPAccount) missingAccounts.push('Accounts Payable (subtype: accounts_payable)');
    if (!hasBankAccount) missingAccounts.push('Bank/Cash account (subtype: bank or cash)');
    if (!hasRevenueAccount) missingAccounts.push('Revenue account (type: revenue)');
    if (!hasExpenseAccount) missingAccounts.push('Expense account (type: expense)');

    if (missingAccounts.length > 0) {
      suggestions.push({
        id: 'coa-missing-accounts',
        type: 'coa',
        severity: 'warning',
        title: 'Chart of Accounts incomplete',
        message: `Auto journal entries require these accounts: ${missingAccounts.join('; ')}`,
        action: 'Add missing accounts to Chart of Accounts to enable automatic journal entries',
        data: { missing: missingAccounts },
      });
    }

    // ── Bank Suggestions ─────────────────────────────────────────────
    const bankAccounts = await this.bankRepo.find({ where: { tenant_id: tenantId, is_active: true } });
    if (bankAccounts.length === 0) {
      suggestions.push({
        id: 'bank-no-accounts',
        type: 'bank',
        severity: 'warning',
        title: 'No bank accounts configured',
        message: 'Add bank accounts to enable payment tracking and auto-reconciliation',
        action: 'Add a bank account',
      });
    }

    return suggestions;
  }

  async getFinancialInsights(tenantId: string): Promise<any> {
    const allAR = await this.arRepo.find({ where: { tenant_id: tenantId } });
    const allAP = await this.apRepo.find({ where: { tenant_id: tenantId } });
    const today = new Date();

    // AR Aging
    const arAging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };
    for (const ar of allAR.filter(a => a.status !== 'paid' as any)) {
      const days = Math.floor((today.getTime() - new Date(ar.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const bal = Number(ar.balance_amount);
      if (days <= 0) arAging.current += bal;
      else if (days <= 30) arAging.days_1_30 += bal;
      else if (days <= 60) arAging.days_31_60 += bal;
      else if (days <= 90) arAging.days_61_90 += bal;
      else arAging.over_90 += bal;
    }

    // AP Aging
    const apAging = { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0 };
    for (const ap of allAP.filter(a => a.status !== 'paid' as any)) {
      const days = Math.floor((today.getTime() - new Date(ap.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const bal = Number(ap.balance_amount);
      if (days <= 0) apAging.current += bal;
      else if (days <= 30) apAging.days_1_30 += bal;
      else if (days <= 60) apAging.days_31_60 += bal;
      else if (days <= 90) apAging.days_61_90 += bal;
      else apAging.over_90 += bal;
    }

    // Top customers by AR balance
    const customerTotals: Record<string, number> = {};
    for (const ar of allAR) {
      customerTotals[ar.customer_id] = (customerTotals[ar.customer_id] || 0) + Number(ar.total_amount);
    }
    const topCustomers = Object.entries(customerTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => ({ customer_id: id, total_invoiced: total }));

    // Top vendors by AP balance
    const vendorTotals: Record<string, number> = {};
    for (const ap of allAP) {
      vendorTotals[ap.vendor_id] = (vendorTotals[ap.vendor_id] || 0) + Number(ap.total_amount);
    }
    const topVendors = Object.entries(vendorTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, total]) => ({ vendor_id: id, total_billed: total }));

    const totalAR = allAR.filter(a => a.status !== 'paid' as any).reduce((s, a) => s + Number(a.balance_amount), 0);
    const totalAP = allAP.filter(a => a.status !== 'paid' as any).reduce((s, a) => s + Number(a.balance_amount), 0);

    return {
      summary: {
        total_receivables: totalAR,
        total_payables: totalAP,
        net_position: totalAR - totalAP,
        ar_invoices_open: allAR.filter(a => a.status !== 'paid' as any).length,
        ap_bills_open: allAP.filter(a => a.status !== 'paid' as any).length,
      },
      ar_aging: arAging,
      ap_aging: apAging,
      top_customers: topCustomers,
      top_vendors: topVendors,
      generated_at: new Date().toISOString(),
    };
  }
}
