import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KafkaService, KAFKA_TOPICS } from './kafka.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { FinancialEventType } from '../../modules/accounting/events/financial.events';

/**
 * KafkaEventForwarder — bridges the in-process NestJS EventEmitter to Kafka.
 *
 * Flow:
 *   Service emits event (EventEmitter2)
 *     → this forwarder picks it up
 *     → if Kafka connected: publish to erp.financial.events
 *     → if Kafka down: push to Redis fallback queue (drained on reconnect)
 *
 * This means the API request thread is never blocked by accounting work.
 * The KafkaConsumerService processes messages asynchronously.
 */
@Injectable()
export class KafkaEventForwarder {
  private readonly logger = new Logger(KafkaEventForwarder.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly consumer: KafkaConsumerService,
  ) {}

  @OnEvent(FinancialEventType.INVOICE_CREATED)
  onInvoiceCreated(event: unknown) {
    void this.forward(FinancialEventType.INVOICE_CREATED, event);
  }

  @OnEvent(FinancialEventType.INVOICE_PAID)
  onInvoicePaid(event: unknown) {
    void this.forward(FinancialEventType.INVOICE_PAID, event);
  }

  @OnEvent(FinancialEventType.BILL_CREATED)
  onBillCreated(event: unknown) {
    void this.forward(FinancialEventType.BILL_CREATED, event);
  }

  @OnEvent(FinancialEventType.BILL_PAID)
  onBillPaid(event: unknown) {
    void this.forward(FinancialEventType.BILL_PAID, event);
  }

  @OnEvent(FinancialEventType.PAYMENT_RECEIVED)
  onPaymentReceived(event: unknown) {
    void this.forward(FinancialEventType.PAYMENT_RECEIVED, event);
  }

  @OnEvent(FinancialEventType.PAYMENT_MADE)
  onPaymentMade(event: unknown) {
    void this.forward(FinancialEventType.PAYMENT_MADE, event);
  }

  @OnEvent(FinancialEventType.STOCK_MOVED)
  onStockMoved(event: unknown) {
    void this.forward(FinancialEventType.STOCK_MOVED, event);
  }

  @OnEvent(FinancialEventType.SHIPMENT_DELIVERED)
  onShipmentDelivered(event: unknown) {
    void this.forward(FinancialEventType.SHIPMENT_DELIVERED, event);
  }

  @OnEvent(FinancialEventType.PURCHASE_ORDER_RECEIVED)
  onPurchaseOrderReceived(event: unknown) {
    void this.forward(FinancialEventType.PURCHASE_ORDER_RECEIVED, event);
  }

  @OnEvent(FinancialEventType.PAYROLL_PROCESSED)
  onPayrollProcessed(event: unknown) {
    void this.forward(FinancialEventType.PAYROLL_PROCESSED, event);
  }

  @OnEvent(FinancialEventType.ASSET_DEPRECIATED)
  onAssetDepreciated(event: unknown) {
    void this.forward(FinancialEventType.ASSET_DEPRECIATED, event);
  }

  private async forward(
    type: FinancialEventType,
    event: unknown,
  ): Promise<void> {
    const payload = event as Record<string, unknown>;
    const tenantId =
      typeof payload?.tenantId === 'string' ? payload.tenantId : 'unknown';
    const message = { type, tenantId, ...payload };

    if (this.kafka.isConnected()) {
      await this.kafka.publish(
        KAFKA_TOPICS.FINANCIAL_EVENTS,
        tenantId,
        message,
      );
      this.logger.debug(`[Kafka] Forwarded ${type}`);
    } else {
      // Kafka is down — push to Redis fallback queue so no event is lost
      await this.consumer.pushToFallback(message);
      this.logger.debug(`[Fallback] Queued ${type} in Redis`);
    }
  }
}
