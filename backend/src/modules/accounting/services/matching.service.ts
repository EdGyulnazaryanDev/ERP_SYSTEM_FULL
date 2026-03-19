import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountReceivableEntity } from '../entities/account-receivable.entity';
import { AccountPayableEntity } from '../entities/account-payable.entity';
import { BankTransactionEntity } from '../entities/bank-transaction.entity';
import { PaymentEntity } from '../entities/payment.entity';

export interface MatchSuggestion {
  confidence: number; // 0-100
  reason: string;
  bankTransactionId?: string;
  invoiceId?: string;
  billId?: string;
  amount: number;
  difference: number;
}

export interface DuplicatePaymentAlert {
  paymentId: string;
  duplicatePaymentId: string;
  amount: number;
  date: string;
  reference: string;
  reason: string;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
    @InjectRepository(BankTransactionEntity)
    private bankTxRepo: Repository<BankTransactionEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
  ) {}

  // Match a payment amount to open invoices
  async matchPaymentToInvoices(
    tenantId: string,
    amount: number,
    customerId?: string,
    date?: string,
  ): Promise<MatchSuggestion[]> {
    const suggestions: MatchSuggestion[] = [];

    const where: any = { tenant_id: tenantId };
    if (customerId) where.customer_id = customerId;

    const openInvoices = await this.arRepo.find({ where });
    const openAR = openInvoices.filter(ar => ar.status !== 'paid' as any);

    for (const ar of openAR) {
      const balance = Number(ar.balance_amount);
      const diff = Math.abs(balance - amount);
      const pctDiff = diff / balance;

      let confidence = 0;
      const reasons: string[] = [];

      // Exact amount match
      if (diff === 0) {
        confidence = 95;
        reasons.push('Exact amount match');
      } else if (pctDiff < 0.01) {
        confidence = 85;
        reasons.push('Amount within 1%');
      } else if (pctDiff < 0.05) {
        confidence = 60;
        reasons.push('Amount within 5%');
      } else {
        continue; // Too far off
      }

      // Customer match bonus
      if (customerId && ar.customer_id === customerId) {
        confidence = Math.min(100, confidence + 10);
        reasons.push('Customer matches');
      }

      // Date proximity bonus
      if (date) {
        const payDate = new Date(date);
        const dueDate = new Date(ar.due_date);
        const daysDiff = Math.abs((payDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 3) {
          confidence = Math.min(100, confidence + 5);
          reasons.push('Date near due date');
        }
      }

      suggestions.push({
        confidence,
        reason: reasons.join(', '),
        invoiceId: ar.id,
        amount: balance,
        difference: diff,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  // Match bank transactions to open invoices/bills
  async reconcileBankTransactions(tenantId: string): Promise<{
    matched: Array<{ bankTxId: string; matchedTo: string; confidence: number; reason: string }>;
    unmatched: Array<{ bankTxId: string; amount: number; description: string }>;
  }> {
    const bankTxs = await this.bankTxRepo.find({
      where: { tenant_id: tenantId, reconciliation_status: 'unreconciled' as any },
    });

    const openAR = await this.arRepo.find({
      where: { tenant_id: tenantId },
    });
    const openAP = await this.apRepo.find({
      where: { tenant_id: tenantId },
    });

    const matched: Array<{ bankTxId: string; matchedTo: string; confidence: number; reason: string }> = [];
    const unmatched: Array<{ bankTxId: string; amount: number; description: string }> = [];

    for (const tx of bankTxs) {
      // Use debit for outgoing, credit for incoming; net = credit - debit
      const txAmount = Number(tx.credit) - Number(tx.debit);
      let bestMatch: { id: string; type: string; confidence: number; reason: string } | null = null;

      // Try matching against AR (incoming payments)
      if (txAmount > 0) {
        for (const ar of openAR.filter(a => a.status !== 'paid' as any)) {
          const balance = Number(ar.balance_amount);
          const diff = Math.abs(balance - txAmount);
          if (diff / balance < 0.02) {
            const confidence = diff === 0 ? 90 : 70;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { id: ar.id, type: `AR:${ar.invoice_number}`, confidence, reason: 'Amount matches invoice balance' };
            }
          }
        }
      }

      // Try matching against AP (outgoing payments)
      if (txAmount < 0) {
        for (const ap of openAP.filter(a => a.status !== 'paid' as any)) {
          const balance = Number(ap.balance_amount);
          const diff = Math.abs(balance - Math.abs(txAmount));
          if (diff / balance < 0.02) {
            const confidence = diff === 0 ? 90 : 70;
            if (!bestMatch || confidence > bestMatch.confidence) {
              bestMatch = { id: ap.id, type: `AP:${ap.bill_number}`, confidence, reason: 'Amount matches bill balance' };
            }
          }
        }
      }

      if (bestMatch) {
        matched.push({ bankTxId: tx.id, matchedTo: bestMatch.type, confidence: bestMatch.confidence, reason: bestMatch.reason });
      } else {
        unmatched.push({ bankTxId: tx.id, amount: txAmount, description: tx.description || '' });
      }
    }

    return { matched, unmatched };
  }

  async detectDuplicatePayments(tenantId: string): Promise<DuplicatePaymentAlert[]> {
    const payments = await this.paymentRepo.find({ where: { tenant_id: tenantId } });
    const alerts: DuplicatePaymentAlert[] = [];
    const seen = new Map<string, PaymentEntity>();

    for (const payment of payments) {
      // Key: same amount + same customer/vendor + same date (within 1 day)
      const key = `${payment.amount}-${payment.customer_id || payment.vendor_id}-${payment.payment_type}`;
      const existing = seen.get(key);

      if (existing) {
        const daysDiff = Math.abs(
          new Date(payment.payment_date).getTime() - new Date(existing.payment_date).getTime()
        ) / (1000 * 60 * 60 * 24);

        if (daysDiff <= 1) {
          alerts.push({
            paymentId: existing.id,
            duplicatePaymentId: payment.id,
            amount: Number(payment.amount),
            date: String(payment.payment_date),
            reference: payment.reference || '',
            reason: `Same amount (${payment.amount}), same party, within 1 day of payment ${existing.payment_number}`,
          });
        }
      } else {
        seen.set(key, payment);
      }
    }

    return alerts;
  }
}
