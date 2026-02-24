import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('products')
@Index(['tenant_id', 'sku'], { unique: true })
@Index(['tenant_id', 'name'])
@Index(['tenant_id', 'category'])
@Index(['tenant_id', 'is_active'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 100, unique: true })
  sku: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 255, nullable: true })
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  cost_price: number;

  @Column('decimal', { precision: 10, scale: 2 })
  selling_price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  tax_rate: number;

  @Column('integer', { default: 0 })
  quantity_in_stock: number;

  @Column('integer', { default: 10 })
  reorder_level: number;

  @Column('varchar', { length: 50, nullable: true })
  unit_of_measure: string;

  @Column('varchar', { length: 255, nullable: true })
  supplier: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('varchar', { length: 255, nullable: true })
  image_url: string;

  @Column('simple-json', { nullable: true })
  attributes: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
