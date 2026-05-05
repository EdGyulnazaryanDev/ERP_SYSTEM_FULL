import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  });

  readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  onModuleInit() {
    collectDefaultMetrics({ register });
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}
