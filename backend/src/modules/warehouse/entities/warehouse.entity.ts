import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BinEntity } from './bin.entity';

@Entity('warehouses')
@Index(['tenant_id', 'warehouse_code'], { unique: true })
export class WarehouseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  warehouse_code: string;

  @Column({ type: 'varchar', length: 255 })
  warehouse_name: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manager_name: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => BinEntity, (bin) => bin.warehouse)
  bins: BinEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
