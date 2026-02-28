import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkOrderOperationEntity } from './work-order-operation.entity';

export enum WorkOrderStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  RELEASED = 'released',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkOrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('work_orders')
export class WorkOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  work_order_number: string;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  bom_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity_planned: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity_produced: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity_scrapped: number;

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure: string;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.DRAFT,
  })
  status: WorkOrderStatus;

  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.NORMAL,
  })
  priority: WorkOrderPriority;

  @Column({ type: 'date' })
  planned_start_date: Date;

  @Column({ type: 'date' })
  planned_end_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_end_date: Date;

  @Column({ type: 'uuid', nullable: true })
  production_line_id: string;

  @Column({ type: 'uuid', nullable: true })
  supervisor_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_order_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  material_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  labor_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  overhead_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_cost: number;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @OneToMany(() => WorkOrderOperationEntity, (operation) => operation.work_order, {
    cascade: true,
  })
  operations: WorkOrderOperationEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
