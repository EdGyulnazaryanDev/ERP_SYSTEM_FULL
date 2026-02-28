import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { OpportunityProductEntity } from './opportunity-product.entity';

export enum OpportunityStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

@Entity('opportunities')
export class OpportunityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  opportunity_code: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @ManyToOne(() => CustomerEntity, (customer) => customer.opportunities)
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: OpportunityStage,
    default: OpportunityStage.PROSPECTING,
  })
  stage: OpportunityStage;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ type: 'date', nullable: true })
  expected_close_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_close_date: Date;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'text', nullable: true })
  competitors: string;

  @Column({ type: 'text', nullable: true })
  next_step: string;

  @Column({ type: 'text', nullable: true })
  loss_reason: string;

  @OneToMany(() => OpportunityProductEntity, (product) => product.opportunity, {
    cascade: true,
  })
  products: OpportunityProductEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
