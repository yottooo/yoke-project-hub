import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Status } from './entities/status.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class StatusesService {
  private readonly POSITION_STEP = 1000;

  constructor(
    @InjectRepository(Status) private readonly repo: Repository<Status>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly projectsService: ProjectsService,
    private readonly events: EventEmitter2,
  ) {}

  async findAllForProject(projectId: number): Promise<Status[]> {
    // Throws 404 when the project does not exist.
    await this.projectsService.findOne(projectId);
    return this.repo.find({
      where: { projectId },
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  /** The project's leftmost status, where tasks go when no status is given. */
  async findFirst(projectId: number): Promise<Status> {
    const first = await this.repo.findOne({
      where: { projectId },
      order: { position: 'ASC', id: 'ASC' },
    });
    if (!first) {
      throw new BadRequestException('This project has no columns');
    }
    return first;
  }

  /** The status, if it belongs to the project; 400 otherwise, since it comes from a task's body. */
  async findForProjectOrThrow(projectId: number, id: number): Promise<Status> {
    const status = await this.repo.findOne({ where: { id, projectId } });
    if (!status) {
      throw new BadRequestException(
        `Status ${id} is not a column of project ${projectId}`,
      );
    }
    return status;
  }

  async create(projectId: number, dto: CreateStatusDto): Promise<Status> {
    await this.projectsService.findOne(projectId);
    await this.assertNameFree(projectId, dto.name);

    // A new column goes to the right end of the board.
    const last = await this.repo.maximum('position', { projectId });
    const status = await this.repo.save(
      this.repo.create({
        ...dto,
        projectId,
        position: (last ?? 0) + this.POSITION_STEP,
      }),
    );
    this.events.emit('status.created', status);
    return status;
  }

  async update(id: number, dto: UpdateStatusDto): Promise<Status> {
    const status = await this.findOneOrThrow(id);
    if (dto.name !== undefined) {
      await this.assertNameFree(status.projectId, dto.name, id);
    }
    const updated = await this.repo.save({ ...status, ...dto });
    this.events.emit('status.updated', updated);
    return updated;
  }

  async remove(id: number): Promise<Status> {
    const status = await this.findOneOrThrow(id);

    const taskCount = await this.tasks.count({ where: { statusId: id } });
    if (taskCount > 0) {
      throw new ConflictException(
        `Move its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} to another column first`,
      );
    }
    const columnCount = await this.repo.count({
      where: { projectId: status.projectId },
    });
    if (columnCount <= 1) {
      throw new ConflictException('A board needs at least one column');
    }

    await this.repo.delete(id);
    this.events.emit('status.deleted', { id, projectId: status.projectId });
    return status;
  }

  private async findOneOrThrow(id: number): Promise<Status> {
    const status = await this.repo.findOne({ where: { id } });
    if (!status) {
      throw new NotFoundException(`Status with ID ${id} not found`);
    }
    return status;
  }

  // Names are unique within a project, ignoring case.
  private async assertNameFree(
    projectId: number,
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const query = this.repo
      .createQueryBuilder('status')
      .where('status.projectId = :projectId', { projectId })
      .andWhere('LOWER(status.name) = LOWER(:name)', { name });
    if (exceptId !== undefined) {
      query.andWhere('status.id != :exceptId', { exceptId });
    }
    const taken = await query.getExists();
    if (taken) {
      throw new ConflictException(`There is already a column named "${name}"`);
    }
  }
}
