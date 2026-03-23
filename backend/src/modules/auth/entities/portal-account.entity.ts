import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum PortalActorType {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
}

@Entity('portal_accounts')
@Unique('uq_portal_account_actor', ['actor_type', 'actor_id'])
@Unique('uq_portal_account_email', ['actor_type', 'email'])
export class PortalAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: PortalActorType,
  })
  actor_type: PortalActorType;

  @Column({ type: 'uuid' })
  actor_id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ name: 'refresh_token', nullable: true, type: 'text' })
  refreshToken: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
