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
import { Project } from '../../projects/entities/project.entity';
import { Status } from '../../statuses/entities/status.entity';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  projectId: number;

  // Deleting a project deletes its tasks in the database.
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // The task's column. RESTRICT: a column can't be deleted while tasks are in it.
  @Index()
  @Column()
  statusId: number;

  @ManyToOne(() => Status, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'statusId' })
  status?: Status;

  // Order within a column; a float so a dropped card can take its neighbours' midpoint.
  @Column({ type: 'double precision' })
  position: number;

  @Column({ type: 'varchar', nullable: true })
  assignee: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date | string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date | string;
}
