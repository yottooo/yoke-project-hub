import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<SafeUser> {
    const saved = await this.repo.save(this.repo.create(data));
    // save() returns the object we passed in, hash included, so pick the safe fields
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      createdAt: saved.createdAt,
    };
  }

  // Only for login: the one place that needs the hash (select: false hides it otherwise)
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
}
