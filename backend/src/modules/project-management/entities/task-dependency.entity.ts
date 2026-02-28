import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish',
}

@Entity('task_dependencies')
export class TaskDependencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => TaskEntity, (task) => task.dependencies)
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Column({ type: 'uuid' })
  depends_on_task_id: string;

  @ManyToOne(() => TaskEntity)
  @JoinColumn({ name: 'depends_on_task_id' })
  depends_on_task: TaskEntity;

  @Column({
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.FINISH_TO_START,
  })
  dependency_type: DependencyType;

  @Column({ type: 'int', default: 0 })
  lag_days: number;

  @CreateDateColumn()
  created_at: Date;
}
