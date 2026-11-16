import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { StatusesService } from '../statuses/statuses.service';
import { EpicsService } from '../epics/epics.service';

@Injectable()
export class TasksService {
  private readonly POSITION_STEP = 1000;

  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
    private readonly projectsService: ProjectsService,
    private readonly statusesService: StatusesService,
    private readonly epicsService: EpicsService,
    private readonly events: EventEmitter2,
  ) {}

  async findAllForProject(projectId: number): Promise<Task[]> {
    // Throws 404 when the project does not exist.
    await this.projectsService.findOne(projectId);
    return this.repo.find({
      where: { projectId },
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  async create(projectId: number, dto: CreateTaskDto): Promise<Task> {
    await this.projectsService.findOne(projectId);

    const status =
      dto.statusId === undefined
        ? await this.statusesService.findFirst(projectId)
        : await this.statusesService.findForProjectOrThrow(
            projectId,
            dto.statusId,
          );

    if (dto.epicId != null) {
      await this.epicsService.findForProjectOrThrow(projectId, dto.epicId);
    }

    // A new task goes to the end of its column.
    const statusId = status.id;
    const last = await this.repo.maximum('position', { projectId, statusId });

    const task = await this.repo.save(
      this.repo.create({
        ...dto,
        projectId,
        statusId,
        position: (last ?? 0) + this.POSITION_STEP,
      }),
    );
    this.events.emit('task.created', task);
    return task;
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOneOrThrow(id);
    if (dto.statusId !== undefined) {
      // A task can only move between its own project's columns.
      await this.statusesService.findForProjectOrThrow(
        task.projectId,
        dto.statusId,
      );
    }
    if (dto.epicId != null) {
      // Same for epics: only the task's own project's.
      await this.epicsService.findForProjectOrThrow(task.projectId, dto.epicId);
    }
    // Only the fields sent: the DTO's unsent optional fields are own `undefined`
    // properties, which a plain spread would copy over stored values such as position.
    const sent = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const updated = await this.repo.save({ ...task, ...sent });
    this.events.emit('task.updated', updated);
    return updated;
  }

  async remove(id: number): Promise<Task> {
    const task = await this.findOneOrThrow(id);
    await this.repo.delete(id);
    this.events.emit('task.deleted', { id, projectId: task.projectId });
    return task;
  }

  private async findOneOrThrow(id: number): Promise<Task> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }
}
