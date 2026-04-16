import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('brains_simulation_runs')
export class SimulationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  trigger_event: string;

  @Column({ type: 'jsonb', nullable: true })
  proposed_plays: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  selected_play_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence_score: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
