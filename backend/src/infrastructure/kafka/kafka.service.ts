import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

export const KAFKA_TOPICS = {
  FINANCIAL_EVENTS: 'erp.financial.events',
  AUDIT_LOGS: 'erp.audit.logs',
  NOTIFICATIONS: 'erp.notifications',
} as const;

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private connected = false;
  private lastError: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private broker = 'localhost:9092';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.broker = this.config.get<string>('KAFKA_BROKER', 'localhost:9092');
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.kafka = new Kafka({
        clientId: 'erp-backend',
        brokers: [this.broker],
        logLevel: logLevel.NOTHING,
        retry: { retries: 3, initialRetryTime: 300 },
      });

      this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
      await this.producer.connect();
      this.connected = true;
      this.logger.log(`Kafka producer connected to ${this.broker}`);

      // Handle unexpected disconnects
      this.producer.on('producer.disconnect', () => {
        this.connected = false;
        this.lastError = 'Producer disconnected unexpectedly';
        this.logger.warn('Kafka producer disconnected — will retry in 30s');
        this.scheduleReconnect();
      });
    } catch (err: unknown) {
      this.connected = false;
      this.producer = null;
      this.lastError = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Kafka unavailable (${this.broker}) — running without Kafka: ${this.lastError}`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.logger.log('Attempting Kafka reconnect...');
      void this.connect();
    }, 30_000);
  }

  async onModuleDestroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connected && this.producer) {
      await this.producer.disconnect().catch(() => {});
    }
  }

  /** Publish a message to a Kafka topic. Fire-and-forget — never throws. */
  async publish(topic: string, key: string, value: unknown): Promise<void> {
    if (!this.connected || !this.producer) return;
    try {
      await this.producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(value) }],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Kafka publish failed [${topic}]: ${msg}`);
      // Mark disconnected so we don't keep hammering a dead broker
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  /** Create a consumer for a given group. Caller is responsible for connect/subscribe/run. */
  createConsumer(groupId: string): Consumer {
    if (!this.kafka) {
      throw new Error('Kafka is not initialized — broker may be unavailable');
    }
    return this.kafka.consumer({ groupId });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): { connected: boolean; broker: string; error: string | null } {
    return {
      connected: this.connected,
      broker: this.broker,
      error: this.lastError,
    };
  }
}
