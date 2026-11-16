import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueryFailedError } from 'typeorm';
import { EpicsService } from './epics.service';
import { UpdateEpicDto } from './dto/update-epic.dto';
import { Epic } from './entities/epic.entity';
import { Task } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { StatusesService } from '../statuses/statuses.service';
import { ProjectsService } from '../projects/projects.service';

// The real package ships ESM, which this Jest setup can't load; only the class token is needed.
jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class {},
  OnEvent: () => () => undefined,
}));

describe('EpicsService', () => {
  let service: EpicsService;
  let tasksService: TasksService;
  let nameTaken: boolean;

  const epicRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    maximum: jest.fn(),
    create: jest.fn((fields: Partial<Epic>) => fields),
    save: jest.fn((fields: Partial<Epic>) =>
      Promise.resolve({ id: 9, ...fields }),
    ),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => {
      const query = {
        where: () => query,
        andWhere: () => query,
        getExists: () => Promise.resolve(nameTaken),
      };
      return query;
    }),
  };
  const taskRepo = {
    findOne: jest.fn(),
    maximum: jest.fn(),
    create: jest.fn((fields: Partial<Task>) => fields),
    save: jest.fn((fields: Partial<Task>) => Promise.resolve(fields)),
  };
  const statusesService = {
    findFirst: jest.fn(),
    findForProjectOrThrow: jest.fn(),
  };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    nameTaken = false;
    statusesService.findFirst.mockResolvedValue({ id: 5, projectId: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EpicsService,
        TasksService,
        { provide: getRepositoryToken(Epic), useValue: epicRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: StatusesService, useValue: statusesService },
        { provide: ProjectsService, useValue: { findOne: jest.fn() } },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(EpicsService);
    tasksService = module.get(TasksService);
  });

  it('appends a new epic after the last one', async () => {
    epicRepo.maximum.mockResolvedValue(2000);

    const epic = await service.create(1, {
      name: 'Onboarding',
      color: 'blue',
      startDate: '2026-11-16',
      endDate: '2026-12-15',
    });

    expect(epic).toMatchObject({
      name: 'Onboarding',
      projectId: 1,
      position: 3000,
    });
    expect(events.emit).toHaveBeenCalledWith('epic.created', epic);
  });

  it('rejects a name the project already uses', async () => {
    nameTaken = true;

    await expect(service.create(1, { name: 'onboarding' })).rejects.toThrow(
      ConflictException,
    );
    expect(epicRepo.save).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start date', async () => {
    await expect(
      service.create(1, {
        name: 'Billing',
        startDate: '2026-12-01',
        endDate: '2026-11-30',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(epicRepo.save).not.toHaveBeenCalled();
  });

  it('checks dates against the stored ones when only one is sent', async () => {
    epicRepo.findOne.mockResolvedValue({
      id: 2,
      projectId: 1,
      startDate: '2026-12-01',
      endDate: null,
    });

    await expect(service.update(2, { endDate: '2026-11-01' })).rejects.toThrow(
      'endDate cannot be before startDate',
    );
    expect(epicRepo.save).not.toHaveBeenCalled();
  });

  it('allows clearing a date with null', async () => {
    epicRepo.findOne.mockResolvedValue({
      id: 2,
      projectId: 1,
      startDate: '2026-12-01',
      endDate: '2026-12-20',
    });

    const epic = await service.update(2, { endDate: null });

    expect(epic).toMatchObject({ endDate: null, startDate: '2026-12-01' });
  });

  it('refuses null for a required field', async () => {
    await expect(
      service.update(2, { name: null as unknown as string }),
    ).rejects.toThrow('name cannot be null');
    expect(epicRepo.save).not.toHaveBeenCalled();
  });

  it('refuses null color on create, not just on update', async () => {
    await expect(
      service.create(1, { name: 'C1', color: null as unknown as 'slate' }),
    ).rejects.toThrow('color cannot be null');
    expect(epicRepo.save).not.toHaveBeenCalled();
  });

  it('keeps stored fields the request did not send', async () => {
    epicRepo.findOne.mockResolvedValue({
      id: 2,
      projectId: 1,
      name: 'Onboarding',
      position: 3000,
    });
    // A real DTO instance has its unsent optional fields as own undefined properties.
    const dto = Object.assign(new UpdateEpicDto(), {
      color: 'red',
      position: undefined,
    });

    const epic = await service.update(2, dto);

    expect(epic).toMatchObject({ color: 'red', position: 3000 });
  });

  it('answers 409 when a concurrent request takes the name first', async () => {
    epicRepo.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT', [], { code: '23505' } as unknown as Error),
    );

    await expect(service.create(1, { name: 'Race' })).rejects.toThrow(
      ConflictException,
    );
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('deletes an epic and tells the board', async () => {
    epicRepo.findOne.mockResolvedValue({ id: 2, projectId: 1 });

    await service.remove(2);

    expect(epicRepo.delete).toHaveBeenCalledWith(2);
    expect(events.emit).toHaveBeenCalledWith('epic.deleted', {
      id: 2,
      projectId: 1,
    });
  });

  describe('tasks', () => {
    it('creates a task inside an epic of its project', async () => {
      epicRepo.findOne.mockResolvedValue({ id: 4, projectId: 1 });
      taskRepo.maximum.mockResolvedValue(null);

      const task = await tasksService.create(1, {
        title: 'Welcome email',
        epicId: 4,
      });

      expect(epicRepo.findOne).toHaveBeenCalledWith({
        where: { id: 4, projectId: 1 },
      });
      expect(task).toMatchObject({ epicId: 4, statusId: 5 });
    });

    it("rejects another project's epic on create", async () => {
      epicRepo.findOne.mockResolvedValue(null);

      await expect(
        tasksService.create(1, { title: 'Welcome email', epicId: 77 }),
      ).rejects.toThrow(BadRequestException);
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it("rejects another project's epic on update", async () => {
      taskRepo.findOne.mockResolvedValue({ id: 3, projectId: 1, statusId: 5 });
      epicRepo.findOne.mockResolvedValue(null);

      await expect(tasksService.update(3, { epicId: 77 })).rejects.toThrow(
        BadRequestException,
      );
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('takes a task out of its epic with null, without looking it up', async () => {
      taskRepo.findOne.mockResolvedValue({
        id: 3,
        projectId: 1,
        statusId: 5,
        epicId: 4,
      });

      const task = await tasksService.update(3, { epicId: null });

      expect(epicRepo.findOne).not.toHaveBeenCalled();
      expect(task).toMatchObject({ epicId: null });
    });
  });
});
