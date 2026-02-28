import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';
import { BillOfMaterialsEntity } from './entities/bill-of-materials.entity';
import { BomComponentEntity } from './entities/bom-component.entity';
import { WorkOrderEntity } from './entities/work-order.entity';
import { WorkOrderOperationEntity } from './entities/work-order-operation.entity';
import { ProductionPlanEntity } from './entities/production-plan.entity';
import { ProductionScheduleEntity } from './entities/production-schedule.entity';
import { QualityCheckEntity } from './entities/quality-check.entity';
import { WorkstationEntity } from './entities/workstation.entity';
import { ProductionBatchEntity } from './entities/production-batch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillOfMaterialsEntity,
      BomComponentEntity,
      WorkOrderEntity,
      WorkOrderOperationEntity,
      ProductionPlanEntity,
      ProductionScheduleEntity,
      QualityCheckEntity,
      WorkstationEntity,
      ProductionBatchEntity,
    ]),
  ],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
