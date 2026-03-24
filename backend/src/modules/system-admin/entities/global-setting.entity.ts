import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('global_settings')
export class GlobalSetting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
