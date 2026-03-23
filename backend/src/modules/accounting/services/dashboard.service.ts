import { Injectable } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { MatchingService } from './matching.service';
import { RuleEngineService } from './rule-engine.service';
import { AccountingService } from '../accounting.service';

export interface AlertItem {
  rule?: string;
  entity?: string;
  entityId?: string;
  id?: string;
  type?: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  title?: string;
  action?: string;
}

export interface SmartDashboard {
  generated_at: string;
  critical_alert_count: number;
  warning_count: number;
  alerts: AlertItem[];
  suggestions: unknown[];
  insights: unknown;
  balance_sheet: unknown;
  profit_and_loss: unknown;
  bank_reconciliation: {
    matched_count: number;
    unmatched_count: number;
    unmatched: unknown[];
  };
  duplicate_payments: unknown[];
}

/** Aggregates all intelligence into a single smart dashboard payload. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly suggestionService: SuggestionService,
    private readonly matchingService: MatchingService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly accountingService: AccountingService,
  ) {}

  async getSmartDashboard(tenantId: string): Promise<SmartDashboard> {
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [
      suggestions,
      ruleAlerts,
      insights,
      duplicates,
      bankReconciliation,
      balanceSheet,
      pnl,
    ] = await Promise.allSettled([
      this.suggestionService.generateSuggestions(tenantId),
      this.ruleEngineService.runAllRules(tenantId),
      this.suggestionService.getFinancialInsights(tenantId),
      this.matchingService.detectDuplicatePayments(tenantId),
      this.matchingService.reconcileBankTransactions(tenantId),
      this.accountingService.getBalanceSheet(tenantId),
      this.accountingService.getProfitAndLoss(tenantId, yearStart, today),
    ]);

    const alerts: AlertItem[] = [
      ...(ruleAlerts.status === 'fulfilled'
        ? ruleAlerts.value.filter((r) => r.severity === 'critical')
        : []),
      ...(suggestions.status === 'fulfilled'
        ? suggestions.value.filter((s) => s.severity === 'critical')
        : []),
    ];

    const duplicateAlerts =
      duplicates.status === 'fulfilled' ? duplicates.value : [];

    if (duplicateAlerts.length > 0) {
      alerts.push({
        rule: 'DUPLICATE_PAYMENT',
        entity: 'payments',
        entityId: '',
        severity: 'critical',
        message: `${duplicateAlerts.length} possible duplicate payment(s) detected`,
        action: 'Review payments for duplicates',
      });
    }

    const unmatchedBankTx =
      bankReconciliation.status === 'fulfilled'
        ? bankReconciliation.value.unmatched.length
        : 0;

    if (unmatchedBankTx > 0) {
      alerts.push({
        rule: 'UNMATCHED_BANK_TX',
        entity: 'bank_transactions',
        entityId: '',
        severity: 'warning',
        message: `${unmatchedBankTx} unmatched bank transaction(s) need reconciliation`,
        action: 'Run bank reconciliation',
      });
    }

    return {
      generated_at: new Date().toISOString(),
      critical_alert_count: alerts.filter((a) => a.severity === 'critical')
        .length,
      warning_count: alerts.filter((a) => a.severity === 'warning').length,
      alerts,
      suggestions: suggestions.status === 'fulfilled' ? suggestions.value : [],
      insights: insights.status === 'fulfilled' ? insights.value : null,
      balance_sheet:
        balanceSheet.status === 'fulfilled' ? balanceSheet.value : null,
      profit_and_loss: pnl.status === 'fulfilled' ? pnl.value : null,
      bank_reconciliation: {
        matched_count:
          bankReconciliation.status === 'fulfilled'
            ? bankReconciliation.value.matched.length
            : 0,
        unmatched_count: unmatchedBankTx,
        unmatched:
          bankReconciliation.status === 'fulfilled'
            ? bankReconciliation.value.unmatched
            : [],
      },
      duplicate_payments: duplicateAlerts,
    };
  }
}
