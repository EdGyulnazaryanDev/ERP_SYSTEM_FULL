import { BrainChainTemplate, BrainExecutionStatus, BrainStepStatus, BrainStepType } from '../enums/brain.enum';

export const BRAIN_EVENTS = {
  APPROVAL_REQUIRED: 'erp.brains.approval-required',
  STEP_APPROVED: 'erp.brains.step-approved',
  STEP_COMPLETED: 'erp.brains.step-completed',
  STEP_FAILED: 'erp.brains.step-failed',
  CHAIN_COMPLETED: 'erp.brains.chain-completed',
} as const;

export interface BrainApprovalRequiredPayload {
  executionId: string;
  stepId?: string;
  stepNumber?: number;
  stepType?: BrainStepType;
  chainTemplate: BrainChainTemplate;
  triggerEvent: string;
  proposedCost: number;
  notifyRole: string;
}

export interface BrainStepCompletedPayload {
  executionId: string;
  stepId: string;
  stepNumber: number;
  stepType: BrainStepType;
  outputData: Record<string, unknown>;
  nextStepNumber?: number;
  nextStepType?: BrainStepType;
  nextStepRequiresApproval?: boolean;
}

export interface BrainStepFailedPayload {
  executionId: string;
  stepId: string;
  stepNumber: number;
  stepType: BrainStepType;
  errorMessage: string;
}

export interface BrainChainCompletedPayload {
  executionId: string;
  chainTemplate: BrainChainTemplate;
  triggerEvent: string;
  totalSteps: number;
  executionStatus: BrainExecutionStatus;
}
