import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ViolationType {
  FIRST_RESPONSE = 'first_response',
  RESOLUTION = 'resolution',
}

@Entity('sla_violations')
export class SLAViolationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @Column({ type: 'uuid' })
  sla_policy_id: string;

  @Column({
    type: 'enum',
    enum: ViolationType,
  })
  violation_type: ViolationType;

  @Column({ type: 'timestamp' })
  expected_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_time: Date;

  @Column({ type: 'int' })
  delay_minutes: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;
}
