export interface RFPEvent {
  tenantId: string;
  eventType: string; // e.g., 'PORT_STRIKE', 'CONTAINER_DELAY'
  severity: string;
  payload: any;
}

export interface BrainPlay {
  brainId: string; // e.g., 'OperatorEngine', 'ControllerEngine'
  description: string;
  estimatedCost: number;
  timeImpactDays: number;
  carbonImpactKg: number;
  confidenceScore: number; // 0.0 to 1.0
  requiresHumanApproval?: boolean;
}
