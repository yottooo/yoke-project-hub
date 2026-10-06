import { Exclude } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
} from 'class-validator';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Column()
  @IsString()
  @Length(3, 60)
  name?: string;

  @Column()
  @IsEmail()
  @IsNotEmpty()
  @Length(3, 200)
  @Unique(['email'])
  @Exclude({ toPlainOnly: true })
  email: string;

  @Column({ select: false })
  @IsString()
  @IsNotEmpty()
  passwordHash: string;

  @CreateDateColumn()
  @IsDate()
  @IsNotEmpty()
  createdAt: Date | Date;
}
