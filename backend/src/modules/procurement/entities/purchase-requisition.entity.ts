import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseRequisitionItemEntity } from './purchase-requisition-item.entity';

export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED = 'converted',
  CANCELLED = 'cancelled',
}

export enum RequisitionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('purchase_requisitions')
export class PurchaseRequisitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  requisition_number: string;

  @Column({ type: 'date' })
  requisition_date: Date;

  @Column({ type: 'uuid', nullable: true })
  requested_by: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    default: RequisitionStatus.DRAFT,
  })
  status: RequisitionStatus;

  @Column({
    type: 'enum',
    enum: RequisitionPriority,
    default: RequisitionPriority.MEDIUM,
  })
  priority: RequisitionPriority;

  @Column({ type: 'date', nullable: true })
  required_by_date: Date;

  @Column({ type: 'text', nullable: true })
  purpose: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @OneToMany(() => PurchaseRequisitionItemEntity, (item) => item.requisition, {
    cascade: true,
  })
  items: PurchaseRequisitionItemEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
