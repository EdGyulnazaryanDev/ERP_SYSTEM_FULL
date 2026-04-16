import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';

@Entity('document_templates')
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ name: 'template_type' })
  templateType: 'html' | 'markdown' | 'json' | 'docx';

  @Column({ type: 'text' })
  templateContent: string;

  @Column({ type: 'jsonb' })
  variablesSchema: Record<string, any>;

  @Column({ type: 'text', array: true, default: ['pdf'] })
  outputFormats: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
