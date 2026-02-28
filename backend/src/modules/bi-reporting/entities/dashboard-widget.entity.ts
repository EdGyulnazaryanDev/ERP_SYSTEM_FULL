import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DashboardEntity } from './dashboard.entity';

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  METRIC = 'metric',
  KPI = 'kpi',
  LIST = 'list',
  MAP = 'map',
  GAUGE = 'gauge',
  PROGRESS = 'progress',
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area',
  SCATTER = 'scatter',
  RADAR = 'radar',
  FUNNEL = 'funnel',
}

@Entity('dashboard_widgets')
export class DashboardWidgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  dashboard_id: string;

  @ManyToOne(() => DashboardEntity, (dashboard) => dashboard.widgets)
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: DashboardEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: WidgetType,
  })
  widget_type: WidgetType;

  @Column({
    type: 'enum',
    enum: ChartType,
    nullable: true,
  })
  chart_type: ChartType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  data_source: string;

  @Column({ type: 'text', nullable: true })
  query: string;

  @Column({ type: 'jsonb', nullable: true })
  config: any;

  @Column({ type: 'jsonb', nullable: true })
  position: any;

  @Column({ type: 'jsonb', nullable: true })
  size: any;

  @Column({ type: 'int', default: 0 })
  refresh_interval: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
