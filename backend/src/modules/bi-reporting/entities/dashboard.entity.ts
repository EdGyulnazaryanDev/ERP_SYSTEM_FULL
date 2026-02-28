import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DashboardWidgetEntity } from './dashboard-widget.entity';

export enum DashboardVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  PUBLIC = 'public',
}

@Entity('dashboards')
export class DashboardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DashboardVisibility,
    default: DashboardVisibility.PRIVATE,
  })
  visibility: DashboardVisibility;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'jsonb', nullable: true })
  layout: any;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => DashboardWidgetEntity, (widget) => widget.dashboard, {
    cascade: true,
  })
  widgets: DashboardWidgetEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
