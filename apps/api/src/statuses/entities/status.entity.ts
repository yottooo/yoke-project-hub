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

export const STATUS_COLORS = [
  'slate',
  'blue',
  'green',
  'amber',
  'red',
  'purple',
  'pink',
  'teal',
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

// A board column. Each project has its own, in `position` order.
@Entity()
export class Status {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  projectId: number;

  // Deleting a project deletes its statuses in the database.
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', default: 'slate' })
  color: StatusColor;

  // Order on the board, left to right; a float, like Task.position.
  @Column({ type: 'double precision' })
  position: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date | string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date | string;
}
