import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiReportingController } from './bi-reporting.controller';
import { BiReportingService } from './bi-reporting.service';
import { DashboardEntity } from './entities/dashboard.entity';
import { DashboardWidgetEntity } from './entities/dashboard-widget.entity';
import { ReportTemplateEntity } from './entities/report-template.entity';
import { SavedReportEntity } from './entities/saved-report.entity';
import { DataExportLogEntity } from './entities/data-export-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DashboardEntity,
      DashboardWidgetEntity,
      ReportTemplateEntity,
      SavedReportEntity,
      DataExportLogEntity,
    ]),
  ],
  controllers: [BiReportingController],
  providers: [BiReportingService],
  exports: [BiReportingService],
})
export class BiReportingModule {}
