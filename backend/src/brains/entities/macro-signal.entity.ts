import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('brains_macro_signals')
export class MacroSignal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  source_type: string; // e.g., 'News', 'Social', 'Weather'

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  sentiment_score: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  region: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  impact_probability: number;

  @Column({ type: 'text', nullable: true })
  raw_data_summary: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
