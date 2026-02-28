import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('automation_logs')
export class AutomationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid', nullable: true })
  rule_id: string;

  @Column({ type: 'uuid', nullable: true })
  workflow_instance_id: string;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string;

  @Column({ type: 'varchar', length: 100 })
  action_type: string;

  @Column({
    type: 'enum',
    enum: LogStatus,
  })
  status: LogStatus;

  @Column({ type: 'jsonb', nullable: true })
  input_data: any;

  @Column({ type: 'jsonb', nullable: true })
  output_data: any;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'int', nullable: true })
  execution_time_ms: number;

  @Column({ type: 'timestamp' })
  executed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
