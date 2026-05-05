import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from './config/config.module';
import { GuardsModule } from './guards/guards.module';
import { MiddlewareModule } from './middleware/middleware.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [DatabaseModule, ConfigModule, GuardsModule, MiddlewareModule, HealthModule, MetricsModule]
})
export class CoreModule {}
