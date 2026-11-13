import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusesService } from './statuses.service';
import { Status } from './entities/status.entity';
import { Task } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { EpicsService } from '../epics/epics.service';

// The real package ships ESM, which this Jest setup can't load; only the class token is needed.
jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class {},
  OnEvent: () => () => undefined,
}));

describe('StatusesService', () => {
  let service: StatusesService;
  let tasksService: TasksService;
  let nameTaken: boolean;

  const statusRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    maximum: jest.fn(),
    count: jest.fn(),
    create: jest.fn((fields: Partial<Status>) => fields),
    save: jest.fn((fields: Partial<Status>) =>
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
    count: jest.fn(),
    findOne: jest.fn(),
    maximum: jest.fn(),
    create: jest.fn((fields: Partial<Task>) => fields),
    save: jest.fn((fields: Partial<Task>) => Promise.resolve(fields)),
  };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    nameTaken = false;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusesService,
        TasksService,
        { provide: getRepositoryToken(Status), useValue: statusRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: ProjectsService, useValue: { findOne: jest.fn() } },
        // TasksService checks epics too; these tests never send an epicId.
        {
          provide: EpicsService,
          useValue: { findForProjectOrThrow: jest.fn() },
        },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(StatusesService);
    tasksService = module.get(TasksService);
  });

  it('appends a new column after the rightmost one', async () => {
    statusRepo.maximum.mockResolvedValue(3000);

    const status = await service.create(1, { name: 'In review' });

    expect(status).toMatchObject({
      name: 'In review',
      projectId: 1,
      position: 4000,
    });
    expect(events.emit).toHaveBeenCalledWith('status.created', status);
  });

  it('rejects a name the project already uses', async () => {
    nameTaken = true;

    await expect(service.create(1, { name: 'done' })).rejects.toThrow(
      ConflictException,
    );
    expect(statusRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to delete a column that still has tasks', async () => {
    statusRepo.findOne.mockResolvedValue({ id: 2, projectId: 1 });
    taskRepo.count.mockResolvedValue(4);

    await expect(service.remove(2)).rejects.toThrow(
      'Move its 4 tasks to another column first',
    );
    expect(statusRepo.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete the last column', async () => {
    statusRepo.findOne.mockResolvedValue({ id: 2, projectId: 1 });
    taskRepo.count.mockResolvedValue(0);
    statusRepo.count.mockResolvedValue(1);

    await expect(service.remove(2)).rejects.toThrow(ConflictException);
    expect(statusRepo.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty column and tells the board', async () => {
    statusRepo.findOne.mockResolvedValue({ id: 2, projectId: 1 });
    taskRepo.count.mockResolvedValue(0);
    statusRepo.count.mockResolvedValue(3);

    await service.remove(2);

    expect(statusRepo.delete).toHaveBeenCalledWith(2);
    expect(events.emit).toHaveBeenCalledWith('status.deleted', {
      id: 2,
      projectId: 1,
    });
  });

  describe('tasks', () => {
    it('puts a new task without a status in the leftmost column', async () => {
      statusRepo.findOne.mockResolvedValue({ id: 5, projectId: 1 });
      taskRepo.maximum.mockResolvedValue(null);

      const task = await tasksService.create(1, { title: 'Write docs' });

      expect(task).toMatchObject({ statusId: 5, position: 1000 });
    });

    it("rejects another project's column on create", async () => {
      statusRepo.findOne.mockResolvedValue(null);

      await expect(
        tasksService.create(1, { title: 'Write docs', statusId: 77 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects another project's column on update", async () => {
      taskRepo.findOne.mockResolvedValue({ id: 3, projectId: 1, statusId: 5 });
      statusRepo.findOne.mockResolvedValue(null);

      await expect(tasksService.update(3, { statusId: 77 })).rejects.toThrow(
        BadRequestException,
      );
      expect(taskRepo.save).not.toHaveBeenCalled();
    });
  });
});
