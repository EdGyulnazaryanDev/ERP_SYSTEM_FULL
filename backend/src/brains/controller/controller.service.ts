import { Injectable, Logger } from '@nestjs/common';
import { RFPEvent, BrainPlay } from '../brains.types';
import { PromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class ControllerService {
  private readonly logger = new Logger(ControllerService.name);

  async proposePlay(rfp: RFPEvent): Promise<BrainPlay> {
    this.logger.log(`Calculating Financial Tactics for ${rfp.eventType}...`);

    const playbookPrompt = PromptTemplate.fromTemplate(`
      As an autonomous Financial AI, analyze the disruption: {eventType}
      Data: {payload}
      Goal: Mitigate margin loss. Provide a purely financial/expedited play (e.g. Air freight or Vendor penalties).
      Return JSON with description, estimatedCost, timeImpactDays, carbonImpactKg.
    `);

    // Simulated LLM Call
    // const formattedPrompt = await playbookPrompt.format({ eventType: rfp.eventType, payload: JSON.stringify(rfp.payload) });
    
    return {
      brainId: 'Controller',
      description: 'Expedite via Air Freight to prevent late-delivery penalties',
      estimatedCost: 150000,
      timeImpactDays: 0,
      carbonImpactKg: 85000,
      confidenceScore: 0.9,
    };
  }
}
