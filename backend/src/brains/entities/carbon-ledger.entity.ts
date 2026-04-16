import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('brains_carbon_ledger')
export class CarbonLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  entity_id: string; // Reference to Route, Supplier, or Product ID

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  kg_co2_estimated: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ethics_rating: number; // 0.00 to 10.00

  @Column({ type: 'varchar', length: 50, nullable: true })
  compliance_status: string; // e.g., 'Pass', 'Fail', 'Flagged'

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
