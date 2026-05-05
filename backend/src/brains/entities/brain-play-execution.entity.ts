import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SimulationRun } from './simulation-run.entity';
import { BrainPlayStep } from './brain-play-step.entity';
import { BrainChainTemplate, BrainExecutionStatus } from '@erp/shared';

@Entity('brain_play_executions')
export class BrainPlayExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  simulation_run_id: string;

  @ManyToOne(() => SimulationRun, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'simulation_run_id' })
  simulation_run: SimulationRun;

  @Column({ type: 'varchar', length: 255 })
  trigger_event: string;

  @Column({ type: 'varchar', length: 100 })
  chain_template: BrainChainTemplate;

  @Column({ type: 'varchar', length: 50, default: BrainExecutionStatus.PENDING_APPROVAL })
  status: BrainExecutionStatus;

  @Column({ type: 'jsonb', nullable: true })
  trigger_payload: Record<string, unknown>;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  proposed_cost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence_score: number;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @OneToMany(() => BrainPlayStep, (step) => step.execution, { cascade: true })
  steps: BrainPlayStep[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
