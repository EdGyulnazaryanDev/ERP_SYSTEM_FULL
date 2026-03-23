import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BillingCycle, PlanCode } from '../subscription.constants';

export class SelectPlanDto {
  @IsEnum(PlanCode)
  planCode: PlanCode;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
