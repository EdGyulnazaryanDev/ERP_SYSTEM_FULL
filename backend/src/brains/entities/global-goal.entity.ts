import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('brains_global_goals')
export class GlobalGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50 })
  goal_type: string; // e.g., 'ESG', 'Profit', 'ServiceLevel'

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  priority_weight: number; // 0.00 to 1.00

  @Column({ type: 'varchar', length: 255, nullable: true })
  target_value: string; // e.g. '99%', '$-5000'

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
