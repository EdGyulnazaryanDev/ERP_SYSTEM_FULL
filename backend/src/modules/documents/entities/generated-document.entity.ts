import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentTemplate } from './document-template.entity';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';

@Entity('generated_documents')
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => DocumentTemplate, (template) => template.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: DocumentTemplate;

  @Column()
  title: string;

  @Column({ name: 'file_path', type: 'varchar', nullable: true })
  filePath: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column()
  format: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ default: 'generated' })
  status: 'generated' | 'processing' | 'failed' | 'archived';

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
