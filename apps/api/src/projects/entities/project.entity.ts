import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamptz' })
   createdAt: Date | string;
  
  @UpdateDateColumn({ type: 'timestamptz' })
   updatedAt: Date | string;
   
  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date;

  @Column({default: 'active'})
  status: 'active' | 'inactive' | 'completed';

  @Column()
  owner: string;

  @Column('simple-array')
  team: string[];
}
