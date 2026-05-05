import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BrainChainTemplate } from '@erp/shared';

@Entity('brain_trigger_rules')
export class BrainTriggerRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  trigger_event: string;

  @Column({ type: 'varchar', length: 100 })
  chain_template: BrainChainTemplate;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  auto_approve_threshold: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  notify_role: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
