import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaService, KAFKA_TOPICS } from './kafka.service';
import { RedisService } from '../redis/redis.service';
import { FinancialEventType } from '../../modules/accounting/events/financial.events';

export interface KafkaFinancialMessage {
  type: FinancialEventType;
  tenantId: string;
  [key: string]: unknown;
}

type MessageHandler = (msg: KafkaFinancialMessage) => Promise<void>;

/**
 * KafkaConsumerService — subscribes to erp.financial.events and
 * dispatches messages to registered handlers with:
 *
 *  - Redis idempotency: each message gets a unique key (offset+partition).
 *    If Redis says "already processed", we skip — prevents double JEs on
 *    consumer restart / Kafka redelivery.
 *
 *  - Redis fallback queue: when Kafka is down, KafkaEventForwarder pushes
 *    to a Redis list. This service drains that list on reconnect so no
 *    events are lost.
 *
 *  - Concurrency cap: max 5 messages processed in parallel per consumer
 *    run, preventing DB overload during catch-up.
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer | null = null;
  private readonly handlers = new Map<string, MessageHandler[]>();
  private running = false;
  private fallbackDrainTimer: NodeJS.Timeout | null = null;

  // Redis keys
  static readonly FALLBACK_QUEUE = 'kafka:fallback:financial_events';
  static readonly IDEMPOTENCY_PREFIX = 'kafka:processed:';
  static readonly IDEMPOTENCY_TTL = 86_400; // 24h

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /** Register a handler for a specific event type. Called by consumer services at startup. */
  register(eventType: FinancialEventType, handler: MessageHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  onModuleInit() {
    // Give other services 2s to register their handlers before we start consuming
    setTimeout(() => void this.startConsuming(), 2000);
  }

  // ── Kafka consumer ──────────────────────────────────────────────────────────

  private async startConsuming(): Promise<void> {
    if (!this.kafkaService.isConnected()) {
      this.logger.warn(
        'Kafka not connected — consumer will not start. Retry in 30s.',
      );
      setTimeout(() => void this.startConsuming(), 30_000);
      return;
    }

    try {
      const groupId = this.config.get<string>(
        'KAFKA_GROUP_ID',
        'erp-consumer-group',
      );
      this.consumer = this.kafkaService.createConsumer(groupId);
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: KAFKA_TOPICS.FINANCIAL_EVENTS,
        fromBeginning: false,
      });

      this.running = true;
      this.logger.log(
        `Kafka consumer started [group=${groupId}] on ${KAFKA_TOPICS.FINANCIAL_EVENTS}`,
      );

      // Drain any events that were queued in Redis while Kafka was down
      void this.drainFallbackQueue();

      await this.consumer.run({
        partitionsConsumedConcurrently: 5,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleKafkaMessage(payload);
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Kafka consumer failed to start: ${msg} — retry in 30s`);
      this.consumer = null;
      this.running = false;
      setTimeout(() => void this.startConsuming(), 30_000);
    }
  }

  private async handleKafkaMessage(payload: EachMessagePayload): Promise<void> {
    const raw = payload.message.value?.toString();
    if (!raw) return;

    // Idempotency key = topic + partition + offset — unique per message
    const idempotencyKey =
      `${KafkaConsumerService.IDEMPOTENCY_PREFIX}` +
      `${payload.topic}:${payload.partition}:${payload.message.offset}`;

    const alreadyProcessed = await this.redis.get<boolean>(idempotencyKey);
    if (alreadyProcessed) {
      this.logger.debug(`Skipping duplicate message at offset ${payload.message.offset}`);
      return;
    }

    await this.dispatch(raw);

    // Mark as processed — TTL 24h (Kafka default retention is 7d, so this is safe)
    await this.redis.set(idempotencyKey, true, KafkaConsumerService.IDEMPOTENCY_TTL);
  }

  // ── Redis fallback queue ────────────────────────────────────────────────────

  /**
   * Push an event to the Redis fallback queue.
   * Called by KafkaEventForwarder when Kafka producer is not connected.
   */
  async pushToFallback(payload: KafkaFinancialMessage): Promise<void> {
    await this.redis.rpush(
      KafkaConsumerService.FALLBACK_QUEUE,
      JSON.stringify(payload),
    );
    this.logger.debug(`[Fallback] Queued ${payload.type} for tenant ${payload.tenantId}`);
  }

  /**
   * Drain the Redis fallback queue — processes all queued events in order.
   * Called when Kafka consumer successfully connects.
   */
  async drainFallbackQueue(): Promise<void> {
    let count = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const raw = await this.redis.lpop(KafkaConsumerService.FALLBACK_QUEUE);
      if (!raw) break;
      await this.dispatch(raw);
      count++;
    }
    if (count > 0) {
      this.logger.log(`[Fallback] Drained ${count} queued event(s) from Redis`);
    }
  }

  // ── Core dispatcher ─────────────────────────────────────────────────────────

  private async dispatch(raw: string): Promise<void> {
    let msg: KafkaFinancialMessage;
    try {
      msg = JSON.parse(raw) as KafkaFinancialMessage;
    } catch {
      this.logger.warn('Failed to parse message — skipping');
      return;
    }

    const { type } = msg;
    if (!type) return;

    const handlers = this.handlers.get(type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(msg);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Handler error for [${type}]: ${errMsg}`);
        // Don't rethrow — one bad message must not stop the consumer
      }
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async onModuleDestroy() {
    this.running = false;
    if (this.fallbackDrainTimer) clearTimeout(this.fallbackDrainTimer);
    if (this.consumer) {
      await this.consumer.disconnect().catch(() => {});
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getFallbackQueueKey(): string {
    return KafkaConsumerService.FALLBACK_QUEUE;
  }
}
