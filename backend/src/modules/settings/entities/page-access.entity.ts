import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('page_access_settings')
export class PageAccessEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  role_id: string;

  @Column({ type: 'varchar', length: 100 })
  page_key: string;

  @Column({ type: 'varchar', length: 255 })
  page_name: string;

  @Column({ type: 'varchar', length: 255 })
  page_path: string;

  @Column({ type: 'boolean', default: true })
  can_view: boolean;

  @Column({ type: 'boolean', default: false })
  can_create: boolean;

  @Column({ type: 'boolean', default: false })
  can_edit: boolean;

  @Column({ type: 'boolean', default: false })
  can_delete: boolean;

  @Column({ type: 'boolean', default: false })
  can_export: boolean;

  @Column({ type: 'jsonb', nullable: true })
  custom_permissions: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
