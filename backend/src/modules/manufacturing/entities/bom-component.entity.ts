import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillOfMaterialsEntity } from './bill-of-materials.entity';

export enum ComponentType {
  RAW_MATERIAL = 'raw_material',
  SUB_ASSEMBLY = 'sub_assembly',
  FINISHED_GOOD = 'finished_good',
  CONSUMABLE = 'consumable',
}

@Entity('bom_components')
export class BomComponentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  bom_id: string;

  @ManyToOne(() => BillOfMaterialsEntity, (bom) => bom.components)
  @JoinColumn({ name: 'bom_id' })
  bom: BillOfMaterialsEntity;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({
    type: 'enum',
    enum: ComponentType,
    default: ComponentType.RAW_MATERIAL,
  })
  component_type: ComponentType;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unit_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_cost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  scrap_percentage: number;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_optional: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
