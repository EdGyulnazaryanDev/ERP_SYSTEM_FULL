import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LeaveBalanceEntity } from './leave-balance.entity';
import { LeaveRequestEntity } from './leave-request.entity';

@Entity('leave_types')
export class LeaveTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  days_allowed: number;

  @Column({ type: 'boolean', default: false })
  carry_forward: boolean;

  @Column({ type: 'int', default: 0 })
  max_carry_forward_days: number;

  @Column({ type: 'boolean', default: true })
  requires_approval: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => LeaveBalanceEntity, (balance) => balance.leave_type)
  leave_balances: LeaveBalanceEntity[];

  @OneToMany(() => LeaveRequestEntity, (request) => request.leave_type)
  leave_requests: LeaveRequestEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
