import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FiscalPeriodEntity } from './fiscal-period.entity';

export enum FiscalYearStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

@Entity('fiscal_years')
export class FiscalYearEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  year_name: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: FiscalYearStatus,
    default: FiscalYearStatus.OPEN,
  })
  status: FiscalYearStatus;

  @Column({ type: 'boolean', default: false })
  is_current: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => FiscalPeriodEntity, (period) => period.fiscal_year)
  periods: FiscalPeriodEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
