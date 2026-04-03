import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RoadmapCategoryEntity } from './roadmap-category.entity';

@Entity('roadmap_items')
export class RoadmapItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => RoadmapCategoryEntity, category => category.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: RoadmapCategoryEntity;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  priority: string; // 'low' | 'medium' | 'high' | 'urgent'

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  // Bi-directional state: The ticket this roadmap item generated
  @Column({ type: 'uuid', nullable: true })
  ticket_id: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
