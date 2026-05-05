import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metrics.getContentType());
    res.end(await this.metrics.getMetrics());
  }
}
