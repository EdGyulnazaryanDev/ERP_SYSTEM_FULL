import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('subscription_plan_limits')
@Unique(['planId', 'key'])
export class SubscriptionPlanLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.limits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column()
  key: string;

  @Column({ type: 'int', nullable: true })
  value: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
