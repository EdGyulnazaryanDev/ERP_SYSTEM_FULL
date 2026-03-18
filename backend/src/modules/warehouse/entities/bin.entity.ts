import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WarehouseEntity } from './warehouse.entity';

@Entity('warehouse_bins')
@Index(['tenant_id', 'warehouse_id', 'bin_code'], { unique: true })
export class BinEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => WarehouseEntity, (w) => w.bins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: WarehouseEntity;

  @Column({ type: 'varchar', length: 100 })
  bin_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aisle: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rack: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  level: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
