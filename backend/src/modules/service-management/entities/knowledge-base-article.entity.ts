import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('knowledge_base_articles')
export class KnowledgeBaseArticleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'uuid' })
  author_id: string;

  @Column({ type: 'boolean', default: false })
  is_public: boolean;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ type: 'int', default: 0 })
  helpful_count: number;

  @Column({ type: 'int', default: 0 })
  not_helpful_count: number;

  @Column({ type: 'jsonb', nullable: true })
  related_articles: string[];

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'timestamp', nullable: true })
  published_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
