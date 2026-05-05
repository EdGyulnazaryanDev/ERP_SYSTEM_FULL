import { BrainChainTemplate, BrainExecutionStatus, BrainStepType } from '../enums/brain.enum';
export declare const BRAIN_EVENTS: {
    readonly APPROVAL_REQUIRED: "erp.brains.approval-required";
    readonly STEP_APPROVED: "erp.brains.step-approved";
    readonly STEP_COMPLETED: "erp.brains.step-completed";
    readonly STEP_FAILED: "erp.brains.step-failed";
    readonly CHAIN_COMPLETED: "erp.brains.chain-completed";
};
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
//# sourceMappingURL=brain.events.d.ts.map