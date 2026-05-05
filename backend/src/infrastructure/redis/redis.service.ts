import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const IORedis = require('ioredis');
type RedisClient = InstanceType<typeof IORedis>;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new IORedis({
      host: this.config.get<string>('REDIS_HOST', 'redis'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // cache write failure is non-fatal
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // ignore
    }
  }

  /** Wrap an async factory with cache-aside logic */
  async cached<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /** Push a string value to the right end of a Redis list (queue) */
  async rpush(key: string, value: string): Promise<void> {
    try {
      await this.client.rpush(key, value);
    } catch {
      // non-fatal
    }
  }

  /** Pop a string value from the left end of a Redis list (queue). Returns null if empty. */
  async lpop(key: string): Promise<string | null> {
    try {
      return await this.client.lpop(key);
    } catch {
      return null;
    }
  }

  /** Get the length of a Redis list */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch {
      return 0;
    }
  }

  /** Set a key only if it does not exist (NX). Returns true if set, false if already existed. */
  async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  }
}
