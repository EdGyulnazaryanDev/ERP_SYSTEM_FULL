import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountingService } from '../accounting.service';
import { JournalEntryType } from '../entities/journal-entry.entity';
import {
  FinancialEventType,
  InvoiceCreatedEvent,
  BillCreatedEvent,
  PaymentReceivedEvent,
  PaymentMadeEvent,
  StockMovedEvent,
  ShipmentDeliveredEvent,
  PurchaseOrderReceivedEvent,
  PayrollProcessedEvent,
} from '../events/financial.events';

/**
 * FinancialBrainService — the central intelligence layer.
 * Listens to events from all modules and automatically creates
 * journal entries, updates balances, and triggers suggestions.
 */
@Injectable()
export class FinancialBrainService {
  private readonly logger = new Logger(FinancialBrainService.name);

  constructor(private readonly accountingService: AccountingService) {}

  // ── AR: Invoice Created → JE: Debit AR, Credit Revenue ──────────────────────
  @OnEvent(FinancialEventType.INVOICE_CREATED)
  async onInvoiceCreated(event: InvoiceCreatedEvent) {
    this.logger.log(`[BRAIN] Invoice created: ${event.invoiceNumber} for $${event.amount}`);
    try {
      const arAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_receivable');
      const revenueAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'sales_revenue')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'service_revenue');

      if (arAccount && revenueAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.SALES,
          description: `Invoice ${event.invoiceNumber}${event.description ? ': ' + event.description : ''}`,
          reference: event.invoiceNumber,
          lines: [
            { account_id: arAccount.id, description: `AR - ${event.invoiceNumber}`, debit: event.amount, credit: 0 },
            { account_id: revenueAccount.id, description: `Revenue - ${event.invoiceNumber}`, debit: 0, credit: event.amount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
        this.logger.log(`[BRAIN] Auto-posted JE ${je.entry_number} for invoice ${event.invoiceNumber}`);
      } else {
        this.logger.warn(`[BRAIN] Missing CoA accounts for invoice JE. Add accounts_receivable and sales_revenue to Chart of Accounts.`);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for invoice ${event.invoiceNumber}: ${e.message}`);
    }
  }

  // ── AR: Payment Received → JE: Debit Bank, Credit AR ────────────────────────
  @OnEvent(FinancialEventType.PAYMENT_RECEIVED)
  async onPaymentReceived(event: PaymentReceivedEvent) {
    this.logger.log(`[BRAIN] Payment received: $${event.amount} for invoice ${event.invoiceNumber}`);
    try {
      const bankAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'bank')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'cash');
      const arAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_receivable');

      if (bankAccount && arAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.RECEIPT,
          description: `Payment received for invoice ${event.invoiceNumber}`,
          reference: event.reference || event.invoiceNumber,
          lines: [
            { account_id: bankAccount.id, description: `Payment - ${event.invoiceNumber}`, debit: event.amount, credit: 0 },
            { account_id: arAccount.id, description: `AR cleared - ${event.invoiceNumber}`, debit: 0, credit: event.amount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
        this.logger.log(`[BRAIN] Auto-posted JE ${je.entry_number} for payment on ${event.invoiceNumber}`);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for payment: ${e.message}`);
    }
  }

  // ── AP: Bill Created → JE: Debit Expense, Credit AP ─────────────────────────
  @OnEvent(FinancialEventType.BILL_CREATED)
  async onBillCreated(event: BillCreatedEvent) {
    this.logger.log(`[BRAIN] Bill created: ${event.billNumber} for $${event.amount}`);
    try {
      const expenseAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'operating_expense')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'administrative_expense');
      const apAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_payable');

      if (expenseAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.PURCHASE,
          description: `Bill ${event.billNumber}${event.description ? ': ' + event.description : ''}`,
          reference: event.billNumber,
          lines: [
            { account_id: expenseAccount.id, description: `Expense - ${event.billNumber}`, debit: event.amount, credit: 0 },
            { account_id: apAccount.id, description: `AP - ${event.billNumber}`, debit: 0, credit: event.amount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
        this.logger.log(`[BRAIN] Auto-posted JE ${je.entry_number} for bill ${event.billNumber}`);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for bill ${event.billNumber}: ${e.message}`);
    }
  }

  // ── AP: Payment Made → JE: Debit AP, Credit Bank ────────────────────────────
  @OnEvent(FinancialEventType.PAYMENT_MADE)
  async onPaymentMade(event: PaymentMadeEvent) {
    this.logger.log(`[BRAIN] Payment made: $${event.amount} for bill ${event.billNumber}`);
    try {
      const apAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_payable');
      const bankAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'bank')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'cash');

      if (apAccount && bankAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.PAYMENT,
          description: `Payment for bill ${event.billNumber}`,
          reference: event.reference || event.billNumber,
          lines: [
            { account_id: apAccount.id, description: `AP cleared - ${event.billNumber}`, debit: event.amount, credit: 0 },
            { account_id: bankAccount.id, description: `Payment - ${event.billNumber}`, debit: 0, credit: event.amount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for AP payment: ${e.message}`);
    }
  }

  // ── Inventory: Stock Moved → JE: Inventory adjustment ───────────────────────
  @OnEvent(FinancialEventType.STOCK_MOVED)
  async onStockMoved(event: StockMovedEvent) {
    if (event.totalCost === 0) return;
    this.logger.log(`[BRAIN] Stock moved: ${event.productName} qty=${event.quantity} cost=$${event.totalCost}`);
    try {
      const inventoryAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'inventory');
      const cogsAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'cost_of_goods_sold');

      if (inventoryAccount && cogsAccount && event.movementType === 'OUT') {
        const je = await this.accountingService.createJournalEntry({
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: JournalEntryType.GENERAL,
          description: `Inventory out: ${event.productName} x${event.quantity}`,
          reference: event.reference,
          lines: [
            { account_id: cogsAccount.id, description: `COGS - ${event.productName}`, debit: event.totalCost, credit: 0 },
            { account_id: inventoryAccount.id, description: `Inventory - ${event.productName}`, debit: 0, credit: event.totalCost },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for stock movement: ${e.message}`);
    }
  }

  // ── Logistics: Shipment Delivered → JE: Debit Shipping Expense, Credit AP ───
  @OnEvent(FinancialEventType.SHIPMENT_DELIVERED)
  async onShipmentDelivered(event: ShipmentDeliveredEvent) {
    if (event.shippingCost === 0) return;
    this.logger.log(`[BRAIN] Shipment delivered: ${event.trackingNumber} cost=$${event.shippingCost}`);
    try {
      const expenseAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'operating_expense');
      const apAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_payable');

      if (expenseAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.GENERAL,
          description: `Shipping cost - ${event.trackingNumber}`,
          reference: event.trackingNumber,
          lines: [
            { account_id: expenseAccount.id, description: `Shipping - ${event.trackingNumber}`, debit: event.shippingCost, credit: 0 },
            { account_id: apAccount.id, description: `Shipping payable - ${event.trackingNumber}`, debit: 0, credit: event.shippingCost },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for shipment: ${e.message}`);
    }
  }

  // ── Procurement: PO Received → JE: Debit Inventory, Credit AP ───────────────
  @OnEvent(FinancialEventType.PURCHASE_ORDER_RECEIVED)
  async onPurchaseOrderReceived(event: PurchaseOrderReceivedEvent) {
    this.logger.log(`[BRAIN] PO received: ${event.poNumber} total=$${event.totalAmount}`);
    try {
      const inventoryAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'inventory');
      const apAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'accounts_payable');

      if (inventoryAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.PURCHASE,
          description: `Goods received - PO ${event.poNumber}`,
          reference: event.poNumber,
          lines: [
            { account_id: inventoryAccount.id, description: `Inventory received - ${event.poNumber}`, debit: event.totalAmount, credit: 0 },
            { account_id: apAccount.id, description: `AP - ${event.poNumber}`, debit: 0, credit: event.totalAmount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for PO receipt: ${e.message}`);
    }
  }

  // ── HR: Payroll Processed → JE: Debit Salary Expense, Credit Bank ───────────
  @OnEvent(FinancialEventType.PAYROLL_PROCESSED)
  async onPayrollProcessed(event: PayrollProcessedEvent) {
    this.logger.log(`[BRAIN] Payroll processed: $${event.netAmount}`);
    try {
      const salaryExpense = await this.accountingService['findDefaultAccount'](event.tenantId, 'administrative_expense')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'operating_expense');
      const bankAccount = await this.accountingService['findDefaultAccount'](event.tenantId, 'bank')
        || await this.accountingService['findDefaultAccount'](event.tenantId, 'cash');

      if (salaryExpense && bankAccount) {
        const je = await this.accountingService.createJournalEntry({
          entry_date: event.date,
          entry_type: JournalEntryType.GENERAL,
          description: `Payroll - employee ${event.employeeId}`,
          reference: event.payslipId,
          lines: [
            { account_id: salaryExpense.id, description: 'Salary expense', debit: event.netAmount, credit: 0 },
            { account_id: bankAccount.id, description: 'Salary payment', debit: 0, credit: event.netAmount },
          ],
        }, event.tenantId);
        await this.accountingService.postJournalEntry(je.id, { posted_by: 'system' }, event.tenantId);
      }
    } catch (e) {
      this.logger.error(`[BRAIN] Failed to create JE for payroll: ${e.message}`);
    }
  }
}
