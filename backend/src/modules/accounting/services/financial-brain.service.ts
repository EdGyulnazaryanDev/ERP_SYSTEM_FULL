import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService } from '../../../infrastructure/kafka/kafka-consumer.service';
import { AccountingService } from '../accounting.service';
import { ARApprovalStatus } from '../entities/account-receivable.entity';
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
import type { KafkaFinancialMessage } from '../../../infrastructure/kafka/kafka-consumer.service';

/**
 * FinancialBrainService — async accounting processor.
 *
 * Registers as a Kafka consumer for all financial event types.
 * All heavy DB work (journal entries, AR/AP creation, balance updates)
 * runs off the HTTP request thread — API calls return immediately.
 *
 * Redis idempotency in KafkaConsumerService ensures no double-processing
 * even if Kafka redelivers a message after a crash.
 */
@Injectable()
export class FinancialBrainService implements OnModuleInit {
  private readonly logger = new Logger(FinancialBrainService.name);

  constructor(
    private readonly accountingService: AccountingService,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  onModuleInit() {
    this.kafkaConsumer.register(FinancialEventType.INVOICE_CREATED, (m) =>
      this.onInvoiceCreated(
        m as unknown as InvoiceCreatedEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(FinancialEventType.PAYMENT_RECEIVED, (m) =>
      this.onPaymentReceived(
        m as unknown as PaymentReceivedEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(FinancialEventType.BILL_CREATED, (m) =>
      this.onBillCreated(
        m as unknown as BillCreatedEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(FinancialEventType.PAYMENT_MADE, (m) =>
      this.onPaymentMade(
        m as unknown as PaymentMadeEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(FinancialEventType.STOCK_MOVED, (m) =>
      this.onStockMoved(
        m as unknown as StockMovedEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(FinancialEventType.SHIPMENT_DELIVERED, (m) =>
      this.onShipmentDelivered(
        m as unknown as ShipmentDeliveredEvent & KafkaFinancialMessage,
      ),
    );
    this.kafkaConsumer.register(
      FinancialEventType.PURCHASE_ORDER_RECEIVED,
      (m) =>
        this.onPurchaseOrderReceived(
          m as unknown as PurchaseOrderReceivedEvent & KafkaFinancialMessage,
        ),
    );
    this.kafkaConsumer.register(FinancialEventType.PAYROLL_PROCESSED, (m) =>
      this.onPayrollProcessed(
        m as unknown as PayrollProcessedEvent & KafkaFinancialMessage,
      ),
    );
  }

  private async onInvoiceCreated(
    event: InvoiceCreatedEvent & KafkaFinancialMessage,
  ) {
    this.logger.log(
      `[BRAIN] Invoice created: ${event.invoiceNumber} for ${event.amount}`,
    );
    try {
      await this.accountingService.createAR(
        {
          customer_id: event.customerId,
          invoice_number: event.invoiceNumber,
          invoice_date: event.date,
          amount: event.amount,
          description: event.description,
          reference: event.invoiceNumber,
          initial_approval_status: ARApprovalStatus.PENDING_APPROVAL,
        },
        event.tenantId,
      );
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed invoice workflow for ${event.invoiceNumber}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onPaymentReceived(
    event: PaymentReceivedEvent & KafkaFinancialMessage,
  ) {
    this.logger.log(
      `[BRAIN] Payment received: ${event.amount} for invoice ${event.invoiceNumber}`,
    );
    try {
      const bankAccount =
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'bank',
        )) ??
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'cash',
        ));
      const arAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_receivable',
      );
      if (bankAccount && arAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.RECEIPT,
            description: `Payment received for invoice ${event.invoiceNumber}`,
            reference: event.reference ?? event.invoiceNumber,
            lines: [
              {
                account_id: bankAccount.id,
                description: `Payment - ${event.invoiceNumber}`,
                debit: event.amount,
                credit: 0,
              },
              {
                account_id: arAccount.id,
                description: `AR cleared - ${event.invoiceNumber}`,
                debit: 0,
                credit: event.amount,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
        this.logger.log(
          `[BRAIN] Auto-posted JE ${je.entry_number} for payment on ${event.invoiceNumber}`,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for payment: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onBillCreated(event: BillCreatedEvent & KafkaFinancialMessage) {
    this.logger.log(
      `[BRAIN] Bill created: ${event.billNumber} for ${event.amount}`,
    );
    try {
      const expenseAccount =
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'operating_expense',
        )) ??
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'administrative_expense',
        ));
      const apAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_payable',
      );
      if (expenseAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.PURCHASE,
            description: `Bill ${event.billNumber}${event.description ? ': ' + event.description : ''}`,
            reference: event.billNumber,
            lines: [
              {
                account_id: expenseAccount.id,
                description: `Expense - ${event.billNumber}`,
                debit: event.amount,
                credit: 0,
              },
              {
                account_id: apAccount.id,
                description: `AP - ${event.billNumber}`,
                debit: 0,
                credit: event.amount,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
        this.logger.log(
          `[BRAIN] Auto-posted JE ${je.entry_number} for bill ${event.billNumber}`,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for bill: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onPaymentMade(event: PaymentMadeEvent & KafkaFinancialMessage) {
    this.logger.log(
      `[BRAIN] Payment made: ${event.amount} for bill ${event.billNumber}`,
    );
    try {
      const apAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_payable',
      );
      const bankAccount =
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'bank',
        )) ??
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'cash',
        ));
      if (apAccount && bankAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.PAYMENT,
            description: `Payment for bill ${event.billNumber}`,
            reference: event.reference ?? event.billNumber,
            lines: [
              {
                account_id: apAccount.id,
                description: `AP cleared - ${event.billNumber}`,
                debit: event.amount,
                credit: 0,
              },
              {
                account_id: bankAccount.id,
                description: `Payment - ${event.billNumber}`,
                debit: 0,
                credit: event.amount,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for AP payment: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onStockMoved(event: StockMovedEvent & KafkaFinancialMessage) {
    if (!event.quantity || event.quantity === 0) return;
    if (!event.totalCost || event.totalCost === 0) {
      this.logger.warn(
        `[BRAIN] STOCK_MOVED skipped for ${event.productName}: totalCost is 0`,
      );
      return;
    }
    this.logger.log(
      `[BRAIN] Stock moved: ${event.productName} qty=${event.quantity} cost=${event.totalCost} type=${event.movementType}`,
    );
    try {
      const inventoryAccount = await this.accountingService[
        'findDefaultAccount'
      ](event.tenantId, 'inventory');
      const cogsAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'cost_of_goods_sold',
      );
      const apAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_payable',
      );
      const today = new Date().toISOString().split('T')[0];

      if (event.movementType === 'OUT' && inventoryAccount && cogsAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: today,
            entry_type: JournalEntryType.GENERAL,
            description: `Inventory out: ${event.productName} x${event.quantity}`,
            reference: event.reference,
            lines: [
              {
                account_id: cogsAccount.id,
                description: `COGS - ${event.productName}`,
                debit: event.totalCost,
                credit: 0,
              },
              {
                account_id: inventoryAccount.id,
                description: `Inventory - ${event.productName}`,
                debit: 0,
                credit: event.totalCost,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      } else if (event.movementType === 'IN' && inventoryAccount) {
        const creditAccount =
          event.source === 'opening'
            ? ((await this.accountingService['findDefaultAccount'](
                event.tenantId,
                'retained_earnings',
              )) ??
              (await this.accountingService['findDefaultAccount'](
                event.tenantId,
                'capital',
              )) ??
              apAccount)
            : apAccount;
        if (!creditAccount) return;
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: today,
            entry_type:
              event.source === 'opening'
                ? JournalEntryType.GENERAL
                : JournalEntryType.PURCHASE,
            description:
              event.source === 'opening'
                ? `Opening stock: ${event.productName} x${event.quantity}`
                : `Inventory received: ${event.productName} x${event.quantity}`,
            reference: event.reference,
            lines: [
              {
                account_id: inventoryAccount.id,
                description: `Inventory IN - ${event.productName}`,
                debit: event.totalCost,
                credit: 0,
              },
              {
                account_id: creditAccount.id,
                description: `${event.source === 'opening' ? 'Opening equity' : 'Payable'} - ${event.productName}`,
                debit: 0,
                credit: event.totalCost,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      } else if (event.movementType === 'ADJUSTMENT' && inventoryAccount) {
        const equityAccount =
          (await this.accountingService['findDefaultAccount'](
            event.tenantId,
            'retained_earnings',
          )) ??
          (await this.accountingService['findDefaultAccount'](
            event.tenantId,
            'owner_equity',
          )) ??
          apAccount;
        if (!equityAccount) return;
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: today,
            entry_type: JournalEntryType.GENERAL,
            description: `Inventory adjustment: ${event.productName} x${event.quantity}`,
            reference: event.reference,
            lines: [
              {
                account_id: inventoryAccount.id,
                description: `Inventory adj - ${event.productName}`,
                debit: event.totalCost,
                credit: 0,
              },
              {
                account_id: equityAccount.id,
                description: `Adjustment offset - ${event.productName}`,
                debit: 0,
                credit: event.totalCost,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for stock movement: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onShipmentDelivered(
    event: ShipmentDeliveredEvent & KafkaFinancialMessage,
  ) {
    if (!event.shippingCost || event.shippingCost === 0) return;
    this.logger.log(
      `[BRAIN] Shipment delivered: ${event.trackingNumber} cost=${event.shippingCost}`,
    );
    try {
      const expenseAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'operating_expense',
      );
      const apAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_payable',
      );
      if (expenseAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.GENERAL,
            description: `Shipping cost - ${event.trackingNumber}`,
            reference: event.trackingNumber,
            lines: [
              {
                account_id: expenseAccount.id,
                description: `Shipping - ${event.trackingNumber}`,
                debit: event.shippingCost,
                credit: 0,
              },
              {
                account_id: apAccount.id,
                description: `Shipping payable - ${event.trackingNumber}`,
                debit: 0,
                credit: event.shippingCost,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for shipment: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onPurchaseOrderReceived(
    event: PurchaseOrderReceivedEvent & KafkaFinancialMessage,
  ) {
    this.logger.log(
      `[BRAIN] PO received: ${event.poNumber} total=${event.totalAmount}`,
    );
    try {
      const inventoryAccount = await this.accountingService[
        'findDefaultAccount'
      ](event.tenantId, 'inventory');
      const apAccount = await this.accountingService['findDefaultAccount'](
        event.tenantId,
        'accounts_payable',
      );
      if (inventoryAccount && apAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.PURCHASE,
            description: `Goods received - PO ${event.poNumber}`,
            reference: event.poNumber,
            lines: [
              {
                account_id: inventoryAccount.id,
                description: `Inventory received - ${event.poNumber}`,
                debit: event.totalAmount,
                credit: 0,
              },
              {
                account_id: apAccount.id,
                description: `AP - ${event.poNumber}`,
                debit: 0,
                credit: event.totalAmount,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for PO receipt: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async onPayrollProcessed(
    event: PayrollProcessedEvent & KafkaFinancialMessage,
  ) {
    this.logger.log(`[BRAIN] Payroll processed: ${event.netAmount}`);
    try {
      const salaryExpense =
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'administrative_expense',
        )) ??
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'operating_expense',
        ));
      const bankAccount =
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'bank',
        )) ??
        (await this.accountingService['findDefaultAccount'](
          event.tenantId,
          'cash',
        ));
      if (salaryExpense && bankAccount) {
        const je = await this.accountingService.createJournalEntry(
          {
            entry_date: event.date,
            entry_type: JournalEntryType.GENERAL,
            description: `Payroll - employee ${event.employeeId}`,
            reference: event.payslipId,
            lines: [
              {
                account_id: salaryExpense.id,
                description: 'Salary expense',
                debit: event.netAmount,
                credit: 0,
              },
              {
                account_id: bankAccount.id,
                description: 'Salary payment',
                debit: 0,
                credit: event.netAmount,
              },
            ],
          },
          event.tenantId,
        );
        await this.accountingService.postJournalEntry(
          je.id,
          {},
          event.tenantId,
        );
      }
    } catch (e: unknown) {
      this.logger.error(
        `[BRAIN] Failed JE for payroll: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
