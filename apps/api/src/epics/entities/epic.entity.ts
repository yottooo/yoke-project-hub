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
import { type StatusColor } from '../../statuses/entities/status.entity';

// A group of related tasks inside one project. Tasks join an epic optionally.
// Names are unique per project ignoring case: a unique index on ("projectId", lower(name)).
// TypeORM can't describe an expression index, so it's made in a migration and left alone here.
@Index('UQ_epic_project_name', { synchronize: false })
@Entity()
export class Epic {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  projectId: number;

  // Deleting a project deletes its epics in the database.
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project?: Project;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Same palette as board columns.
  @Column({ type: 'varchar', default: 'slate' })
  color: StatusColor;

  // Calendar days without a time zone; TypeORM returns them as 'YYYY-MM-DD'.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  // Order in the epic bar, left to right; a float, like Status.position.
  @Column({ type: 'double precision' })
  position: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date | string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date | string;
}
