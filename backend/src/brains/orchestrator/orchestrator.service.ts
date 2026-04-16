import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorService } from '../operator/operator.service';
import { ControllerService } from '../controller/controller.service';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { RFPEvent, BrainPlay } from '../brains.types';
import { SimulationRun } from '../entities/simulation-run.entity';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly operator: OperatorService,
    private readonly controller: ControllerService,
    private readonly sustainability: SustainabilityService,
    @InjectRepository(SimulationRun)
    private readonly simulationRepo: Repository<SimulationRun>,
  ) {}

  async runStrategyAuction(rfp: RFPEvent): Promise<SimulationRun> {
    this.logger.log(`Starting Strategy Auction for Event: ${rfp.eventType}`);

    // Step 1: Blast RFP to Sub-Brains
    const operatorPlay = await this.operator.proposePlay(rfp);
    const controllerPlay = await this.controller.proposePlay(rfp);

    let plays = [operatorPlay, controllerPlay];

    // Step 2: Audit plays via Sustainability Brain
    plays = await Promise.all(
      plays.map(play => this.sustainability.auditPlay(play))
    );

    // Step 3: Circuit Breaker Logic
    const CIRCUIT_BREAKER_COST_THRESHOLD = 100000; // $100k
    plays.forEach(play => {
      if (play.estimatedCost > CIRCUIT_BREAKER_COST_THRESHOLD) {
        play.requiresHumanApproval = true;
        play.description += ' [CIRCUIT BREAKER: Cost Exceeded Threshold]';
      }
    });

    // Step 4: Evaluate against Global Goals
    // (Mocking Global Goal = 'Maximize Profit' -> pick lowest cost that isn't flagged)
    let selectedPlay = plays.sort((a, b) => a.estimatedCost - b.estimatedCost)[0];

    // Check if the cheapest play needs human approval due to ESG flag
    if (selectedPlay.requiresHumanApproval) {
      this.logger.warn(`Selected play requires human approval: ${selectedPlay.description}`);
    }

    // Step 5: Log Simulation Run (State Memory)
    const simulationRecord = this.simulationRepo.create({
      tenant_id: rfp.tenantId,
      trigger_event: rfp.eventType,
      proposed_plays: plays,
      selected_play_id: selectedPlay.brainId,
      confidence_score: selectedPlay.confidenceScore,
    });

    await this.simulationRepo.save(simulationRecord);
    
    this.logger.log(`Auction Complete. Selected Play: ${selectedPlay.description}`);
    return simulationRecord;
  }
}
