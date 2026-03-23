import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AccountReceivableEntity } from '../entities/account-receivable.entity';
import { AccountPayableEntity } from '../entities/account-payable.entity';

export interface RuleResult {
  rule: string;
  entity: string;
  entityId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectRepository(AccountReceivableEntity)
    private arRepo: Repository<AccountReceivableEntity>,
    @InjectRepository(AccountPayableEntity)
    private apRepo: Repository<AccountPayableEntity>,
  ) {}

  async evaluateARRules(tenantId: string): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    const today = new Date();

    const openAR = await this.arRepo.find({
      where: { tenant_id: tenantId },
    });

    for (const ar of openAR) {
      if (ar.status === 'paid') continue;

      const dueDate = new Date(ar.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Rule: Invoice overdue > 0 days
      if (daysOverdue > 0) {
        const severity = daysOverdue > 30 ? 'critical' : daysOverdue > 7 ? 'warning' : 'info';
        results.push({
          rule: 'AR_OVERDUE',
          entity: 'accounts_receivable',
          entityId: ar.id,
          severity,
          message: `Invoice ${ar.invoice_number} is ${daysOverdue} day(s) overdue. Balance: $${Number(ar.balance_amount).toFixed(2)}`,
          action: daysOverdue > 30 ? 'Consider sending a final notice or escalating to collections' : 'Send payment reminder',
        });

        // Auto-mark as overdue
        if (ar.status !== 'overdue' as any) {
          await this.arRepo.update(ar.id, { status: 'overdue' as any });
        }
      }

      // Rule: Large outstanding balance
      if (Number(ar.balance_amount) > 10000 && daysOverdue > 0) {
        results.push({
          rule: 'AR_HIGH_RISK',
          entity: 'accounts_receivable',
          entityId: ar.id,
          severity: 'critical',
          message: `High-risk invoice ${ar.invoice_number}: $${Number(ar.balance_amount).toFixed(2)} outstanding for ${daysOverdue} days`,
          action: 'Immediate follow-up required',
        });
      }
    }

    return results;
  }

  async evaluateAPRules(tenantId: string): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const openAP = await this.apRepo.find({
      where: { tenant_id: tenantId },
    });

    for (const ap of openAP) {
      if (ap.status === 'paid') continue;

      const dueDate = new Date(ap.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = -daysUntilDue;

      // Rule: Bill due within 7 days
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        results.push({
          rule: 'AP_DUE_SOON',
          entity: 'accounts_payable',
          entityId: ap.id,
          severity: daysUntilDue <= 2 ? 'critical' : 'warning',
          message: `Bill ${ap.bill_number} due in ${daysUntilDue} day(s). Amount: $${Number(ap.balance_amount).toFixed(2)}`,
          action: 'Schedule payment',
        });
      }

      // Rule: Bill overdue
      if (daysOverdue > 0) {
        results.push({
          rule: 'AP_OVERDUE',
          entity: 'accounts_payable',
          entityId: ap.id,
          severity: daysOverdue > 30 ? 'critical' : 'warning',
          message: `Bill ${ap.bill_number} is ${daysOverdue} day(s) overdue. This may affect vendor relationship.`,
          action: 'Pay immediately to avoid late fees',
        });

        if (ap.status !== 'overdue' as any) {
          await this.apRepo.update(ap.id, { status: 'overdue' as any });
        }
      }
    }

    return results;
  }

  async runAllRules(tenantId: string): Promise<RuleResult[]> {
    const [arResults, apResults] = await Promise.all([
      this.evaluateARRules(tenantId),
      this.evaluateAPRules(tenantId),
    ]);
    return [...arResults, ...apResults];
  }
}
