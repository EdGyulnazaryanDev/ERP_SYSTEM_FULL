import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanySubscription } from './company-subscription.entity';
import { SubscriptionPlanFeature } from './subscription-plan-feature.entity';
import { SubscriptionPlanLimit } from './subscription-plan-limit.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'monthly_price' })
  monthlyPrice: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'yearly_price' })
  yearlyPrice: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => SubscriptionPlanFeature, (feature) => feature.plan, {
    cascade: true,
  })
  features: SubscriptionPlanFeature[];

  @OneToMany(() => SubscriptionPlanLimit, (limit) => limit.plan, {
    cascade: true,
  })
  limits: SubscriptionPlanLimit[];

  @OneToMany(() => CompanySubscription, (subscription) => subscription.plan)
  subscriptions: CompanySubscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
