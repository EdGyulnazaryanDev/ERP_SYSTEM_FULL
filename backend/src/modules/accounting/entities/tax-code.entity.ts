import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaxType {
  SALES_TAX = 'sales_tax',
  PURCHASE_TAX = 'purchase_tax',
  VAT = 'vat',
  GST = 'gst',
  WITHHOLDING_TAX = 'withholding_tax',
}

@Entity('tax_codes')
export class TaxCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  tax_code: string;

  @Column({ type: 'varchar', length: 255 })
  tax_name: string;

  @Column({
    type: 'enum',
    enum: TaxType,
  })
  tax_type: TaxType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  tax_rate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  tax_account_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
