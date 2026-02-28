import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
}

@Entity('bank_accounts')
export class BankAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  account_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  account_number: string;

  @Column({
    type: 'enum',
    enum: BankAccountType,
  })
  account_type: BankAccountType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  branch: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  swift_code: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  iban: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  opening_balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  current_balance: number;

  @Column({ type: 'uuid', nullable: true })
  gl_account_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
