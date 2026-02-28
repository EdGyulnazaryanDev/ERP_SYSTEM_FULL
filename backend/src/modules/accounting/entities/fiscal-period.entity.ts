import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FiscalYearEntity } from './fiscal-year.entity';

export enum PeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
}

@Entity('fiscal_periods')
export class FiscalPeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  fiscal_year_id: string;

  @ManyToOne(() => FiscalYearEntity, (year) => year.periods)
  @JoinColumn({ name: 'fiscal_year_id' })
  fiscal_year: FiscalYearEntity;

  @Column({ type: 'varchar', length: 50 })
  period_name: string;

  @Column({ type: 'int' })
  period_number: number;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: PeriodStatus,
    default: PeriodStatus.OPEN,
  })
  status: PeriodStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
