import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ForecasterService } from './forecaster/forecaster.service';
import { OperatorService } from './operator/operator.service';
import { SustainabilityService } from './sustainability/sustainability.service';
import { ControllerService } from './controller/controller.service';

import { GlobalGoal } from './entities/global-goal.entity';
import { SimulationRun } from './entities/simulation-run.entity';
import { MacroSignal } from './entities/macro-signal.entity';
import { CarbonLedger } from './entities/carbon-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GlobalGoal,
      SimulationRun,
      MacroSignal,
      CarbonLedger,
    ]),
  ],
  providers: [
    OrchestratorService,
    ForecasterService,
    OperatorService,
    SustainabilityService,
    ControllerService
  ],
  exports: [
    OrchestratorService,
    ForecasterService,
    OperatorService,
    SustainabilityService,
    ControllerService
  ]
})
export class BrainsModule {}
