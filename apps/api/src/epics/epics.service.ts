import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Epic } from './entities/epic.entity';
import { CreateEpicDto } from './dto/create-epic.dto';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { ProjectsService } from '../projects/projects.service';

// Fields whose columns are NOT NULL. IsOptional lets null through validation, so refuse it here.
const REQUIRED_FIELDS = ['name', 'color', 'position'] as const;

// Postgres error code for a unique index violation.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class EpicsService {
  private readonly POSITION_STEP = 1000;

  constructor(
    @InjectRepository(Epic) private readonly repo: Repository<Epic>,
    private readonly projectsService: ProjectsService,
    private readonly events: EventEmitter2,
  ) {}

  async findAllForProject(projectId: number): Promise<Epic[]> {
    // Throws 404 when the project does not exist.
    await this.projectsService.findOne(projectId);
    return this.repo.find({
      where: { projectId },
      order: { position: 'ASC', id: 'ASC' },
    });
  }

  /** The epic, if it belongs to the project; 400 otherwise, since it comes from a task's body. */
  async findForProjectOrThrow(projectId: number, id: number): Promise<Epic> {
    const epic = await this.repo.findOne({ where: { id, projectId } });
    if (!epic) {
      throw new BadRequestException(
        `Epic ${id} is not an epic of project ${projectId}`,
      );
    }
    return epic;
  }

  async create(projectId: number, input: CreateEpicDto): Promise<Epic> {
    const dto = this.cleanInput(input);
    await this.projectsService.findOne(projectId);
    this.assertDateOrder(dto.startDate, dto.endDate);
    await this.assertNameFree(projectId, dto.name);

    // A new epic goes to the right end of the epic bar.
    const last = await this.repo.maximum('position', { projectId });
    const epic = await this.saveUniqueName(
      this.repo.create({
        ...dto,
        projectId,
        position: (last ?? 0) + this.POSITION_STEP,
      }),
    );
    this.events.emit('epic.created', epic);
    return epic;
  }

  async update(id: number, input: UpdateEpicDto): Promise<Epic> {
    const dto = this.cleanInput(input);
    const epic = await this.findOneOrThrow(id);
    // Check the dates as they will be after the update, not just the ones sent.
    this.assertDateOrder(
      dto.startDate !== undefined ? dto.startDate : epic.startDate,
      dto.endDate !== undefined ? dto.endDate : epic.endDate,
    );
    if (dto.name !== undefined) {
      await this.assertNameFree(epic.projectId, dto.name, id);
    }
    const updated = await this.saveUniqueName({ ...epic, ...dto });
    this.events.emit('epic.updated', updated);
    return updated;
  }

  /**
   * The fields actually sent. A DTO instance has its unsent optional fields as own
   * `undefined` properties, which a spread would copy over stored values (e.g. position).
   * Null for a NOT NULL column is refused here, since IsOptional lets null through.
   */
  private cleanInput<T extends object>(input: T): T {
    const sent = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ) as T;
    for (const field of REQUIRED_FIELDS) {
      if ((sent as Record<string, unknown>)[field] === null) {
        throw new BadRequestException(`${field} cannot be null`);
      }
    }
    return sent;
  }

  /**
   * Saves, turning a unique-index violation into 409. assertNameFree gives the friendly
   * answer; the index (see the AddEpicNameUnique migration) catches two requests racing past it.
   */
  private async saveUniqueName(epic: Epic): Promise<Epic> {
    try {
      return await this.repo.save(epic);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code ===
          UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `There is already an epic named "${epic.name}"`,
        );
      }
      throw error;
    }
  }

  // The database sets the epic's tasks to "no epic" (ON DELETE SET NULL).
  async remove(id: number): Promise<Epic> {
    const epic = await this.findOneOrThrow(id);
    await this.repo.delete(id);
    this.events.emit('epic.deleted', { id, projectId: epic.projectId });
    return epic;
  }

  private async findOneOrThrow(id: number): Promise<Epic> {
    const epic = await this.repo.findOne({ where: { id } });
    if (!epic) {
      throw new NotFoundException(`Epic with ID ${id} not found`);
    }
    return epic;
  }

  // 'YYYY-MM-DD' strings sort the same way as the days they name.
  private assertDateOrder(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
  }

  // Names are unique within a project, ignoring case.
  private async assertNameFree(
    projectId: number,
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const query = this.repo
      .createQueryBuilder('epic')
      .where('epic.projectId = :projectId', { projectId })
      .andWhere('LOWER(epic.name) = LOWER(:name)', { name });
    if (exceptId !== undefined) {
      query.andWhere('epic.id != :exceptId', { exceptId });
    }
    const taken = await query.getExists();
    if (taken) {
      throw new ConflictException(`There is already an epic named "${name}"`);
    }
  }
}
