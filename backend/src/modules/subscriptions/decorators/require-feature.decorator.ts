import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '../subscription.constants';

export const FEATURE_KEY = 'subscription_feature';

export const RequireFeature = (...features: PlanFeature[]) =>
  SetMetadata(FEATURE_KEY, features);
