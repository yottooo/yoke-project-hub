import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
   createdAt: Date | string;
  
  @UpdateDateColumn()
   updatedAt: Date | string;
   
  @Column()
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({default: 'active'})
  status: 'active' | 'inactive' | 'completed';

  @Column()
  owner: string;

  @Column('simple-array')
  team: string[];
}
