import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BrainPlayExecution } from './brain-play-execution.entity';
import { BrainStepType, BrainStepStatus } from '@erp/shared';

@Entity('brain_play_steps')
export class BrainPlayStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  execution_id: string;

  @ManyToOne(() => BrainPlayExecution, (execution) => execution.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: BrainPlayExecution;

  @Column({ type: 'int' })
  step_number: number;

  @Column({ type: 'varchar', length: 100 })
  step_type: BrainStepType;

  @Column({ type: 'varchar', length: 50, default: BrainStepStatus.PENDING })
  status: BrainStepStatus;

  @Column({ type: 'boolean', default: true })
  requires_approval: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  notify_role: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'jsonb', nullable: true })
  input_data: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output_data: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamptz', nullable: true })
  executed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
