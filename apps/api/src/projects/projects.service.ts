import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { REDIS } from '../redis/redis.module';

@Injectable()
export class ProjectsService {
  private readonly ALL_KEY = 'projects:all';
  private readonly TTL = 60;

  constructor(
    @InjectRepository(Project) private readonly repo: Repository<Project>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = await this.repo.save(this.repo.create(dto));
    await this.redis.del(this.ALL_KEY);
    this.events.emit('project.created', project);
    return project;
  }

  async findAll() {
    const cached = await this.redis.get(this.ALL_KEY);

    if (cached) {
      return JSON.parse(cached) as Project[];
    }

    const projects = await this.repo.find({ order: { createdAt: 'DESC' } });
    await this.redis.set(
      this.ALL_KEY,
      JSON.stringify(projects),
      'EX',
      this.TTL,
    );
    return projects;
  }

  async findOne(id: number) {
    const key = `projects:${id}`;
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached) as Project;
    }

    if (!Number.isInteger(id)) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    
    const project = await this.repo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    await this.redis.set(key, JSON.stringify(project), 'EX', this.TTL);
    return project;
  }

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.repo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    const updated = await this.repo.save({ ...project, ...dto });
    await this.redis.set(
      `projects:${id}`,
      JSON.stringify(updated),
      'EX',
      this.TTL,
    );
    await this.redis.del(this.ALL_KEY);
    this.events.emit('project.updated', updated);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const result = await this.repo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    
    await this.redis.del(this.ALL_KEY, `projects:${id}`);
    this.events.emit('project.removed', { id });
  }
}
