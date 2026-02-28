import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrderEntity } from './work-order.entity';

export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('work_order_operations')
export class WorkOrderOperationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  work_order_id: string;

  @ManyToOne(() => WorkOrderEntity, (wo) => wo.operations)
  @JoinColumn({ name: 'work_order_id' })
  work_order: WorkOrderEntity;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 255 })
  operation_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  workstation_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  setup_time_hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  run_time_hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actual_time_hours: number;

  @Column({
    type: 'enum',
    enum: OperationStatus,
    default: OperationStatus.PENDING,
  })
  status: OperationStatus;

  @Column({ type: 'timestamp', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_time: Date;

  @Column({ type: 'uuid', nullable: true })
  operator_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
