// localStorage-backed stand-ins for login, tasks and columns; delete once both VITE_MOCK_* flags are off.

import type { AuthApi } from './auth';
import { ApiError } from './client';
import type { EpicsApi } from './epics';
import type { StatusesApi } from './statuses';
import type { TasksApi } from './tasks';
import type { Epic, Task, TaskStatus } from './types';

/** Fake network latency, so loading states are visible. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150));
}

/** Accepts any email and password. */
export const mockAuthApi: AuthApi = {
  async login({ email, password }) {
    await delay();
    if (!email.trim() || !password) {
      throw new ApiError(401, 'Invalid email or password');
    }
    return {
      accessToken: 'mock-token',
      user: { id: 1, email, name: email.split('@')[0] },
    };
  },
  async register({ email, name }) {
    await delay();
    return { id: 1, email, name: name ?? null };
  },
};

const STORAGE_KEY = 'project-hub.mock.tasks';
const POSITION_STEP = 1000;

// Stands in for the socket: tells this browser's other tabs which project's tasks changed.
const channel = new BroadcastChannel('project-hub.mock.task-events');

// Read on every call, because another tab may have written since the last one.
function load(): Task[] {
  try {
    const tasks = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as (Task & { status?: string })[];
    return tasks.map(upgradeTask);
  } catch {
    return [];
  }
}

// Tasks saved before custom columns have a status string instead of a statusId.
const LEGACY_STATUS_NAMES: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

// Tasks saved before epics have no epicId.
function upgradeTask({ status, ...stored }: Task & { status?: string }): Task {
  const task: Task = { ...stored, epicId: stored.epicId ?? null };
  if (status === undefined) return task;
  const columns = loadStatuses(task.projectId);
  const name = LEGACY_STATUS_NAMES[status] ?? 'To do';
  const column = columns.find((c) => c.name === name) ?? columns[0];
  return { ...task, statusId: column.id };
}

/** Like the API: an epic of another project is a 400. */
function assertEpicInProject(
  projectId: number,
  epicId: number | null | undefined,
): void {
  if (epicId == null) return;
  const ok = loadAllEpics().some(
    (e) => e.id === epicId && e.projectId === projectId,
  );
  if (!ok) {
    throw new ApiError(400, `Epic ${epicId} is not an epic of project ${projectId}`);
  }
}

function save(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function findOrThrow(tasks: Task[], id: number): Task {
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new ApiError(404, `Task with ID ${id} not found`);
  return task;
}

export const mockTasksApi: TasksApi = {
  async list(projectId) {
    await delay();
    return load().filter((task) => task.projectId === projectId);
  },

  async create(projectId, input) {
    await delay();
    const tasks = load();
    assertEpicInProject(projectId, input.epicId);
    const statusId = input.statusId ?? loadStatuses(projectId)[0].id;
    const now = new Date().toISOString();
    // A new task goes to the end of its column.
    const lastPosition = Math.max(
      0,
      ...tasks
        .filter((t) => t.projectId === projectId && t.statusId === statusId)
        .map((t) => t.position),
    );
    const task: Task = {
      id: Math.max(0, ...tasks.map((t) => t.id)) + 1,
      projectId,
      title: input.title,
      description: input.description ?? null,
      statusId,
      epicId: input.epicId ?? null,
      position: lastPosition + POSITION_STEP,
      assignee: input.assignee ?? null,
      createdAt: now,
      updatedAt: now,
    };
    save([...tasks, task]);
    channel.postMessage(projectId);
    return task;
  },

  async update(id, input) {
    await delay();
    const tasks = load();
    const current = findOrThrow(tasks, id);
    assertEpicInProject(current.projectId, input.epicId);
    const task: Task = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    save(tasks.map((t) => (t.id === id ? task : t)));
    channel.postMessage(task.projectId);
    return task;
  },

  async remove(id) {
    await delay();
    const tasks = load();
    const task = findOrThrow(tasks, id);
    save(tasks.filter((t) => t.id !== id));
    channel.postMessage(task.projectId);
    return task;
  },

  subscribe(onChange) {
    const listener = (message: MessageEvent<number>) => onChange(message.data);
    channel.addEventListener('message', listener);
    return () => channel.removeEventListener('message', listener);
  },
};

const STATUSES_KEY = 'project-hub.mock.statuses';
const statusChannel = new BroadcastChannel('project-hub.mock.status-events');

function loadAllStatuses(): TaskStatus[] {
  try {
    return JSON.parse(
      localStorage.getItem(STATUSES_KEY) ?? '[]',
    ) as TaskStatus[];
  } catch {
    return [];
  }
}

function saveStatuses(statuses: TaskStatus[]): void {
  localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));
}

/** A project's columns in board order; the API's three defaults the first time it is asked. */
function loadStatuses(projectId: number): TaskStatus[] {
  const all = loadAllStatuses();
  const own = all.filter((s) => s.projectId === projectId);
  if (own.length > 0) {
    return own.sort((a, b) => a.position - b.position || a.id - b.id);
  }

  const now = new Date().toISOString();
  const firstId = Math.max(0, ...all.map((s) => s.id)) + 1;
  const defaults: TaskStatus[] = (
    [
      ['To do', 'slate'],
      ['In progress', 'blue'],
      ['Done', 'green'],
    ] as const
  ).map(([name, color], index) => ({
    id: firstId + index,
    projectId,
    name,
    color,
    position: (index + 1) * POSITION_STEP,
    createdAt: now,
    updatedAt: now,
  }));
  saveStatuses([...all, ...defaults]);
  return defaults;
}

function findStatusOrThrow(statuses: TaskStatus[], id: number): TaskStatus {
  const status = statuses.find((s) => s.id === id);
  if (!status) throw new ApiError(404, `Status with ID ${id} not found`);
  return status;
}

function assertNameFree(
  statuses: TaskStatus[],
  projectId: number,
  name: string,
  exceptId?: number,
): void {
  const taken = statuses.some(
    (s) =>
      s.projectId === projectId &&
      s.id !== exceptId &&
      s.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) {
    throw new ApiError(409, `There is already a column named "${name}"`);
  }
}

/** Mirrors the API's rules: unique names, no deleting a column with tasks or the last one. */
export const mockStatusesApi: StatusesApi = {
  async list(projectId) {
    await delay();
    return loadStatuses(projectId);
  },

  async create(projectId, input) {
    await delay();
    const own = loadStatuses(projectId);
    const all = loadAllStatuses();
    const name = input.name.trim();
    assertNameFree(all, projectId, name);
    const now = new Date().toISOString();
    const status: TaskStatus = {
      id: Math.max(0, ...all.map((s) => s.id)) + 1,
      projectId,
      name,
      color: input.color ?? 'slate',
      // A new column goes to the right end of the board.
      position: Math.max(0, ...own.map((s) => s.position)) + POSITION_STEP,
      createdAt: now,
      updatedAt: now,
    };
    saveStatuses([...all, status]);
    statusChannel.postMessage(projectId);
    return status;
  },

  async update(id, input) {
    await delay();
    const all = loadAllStatuses();
    const current = findStatusOrThrow(all, id);
    const name = input.name?.trim();
    if (name !== undefined) assertNameFree(all, current.projectId, name, id);
    const status: TaskStatus = {
      ...current,
      ...input,
      ...(name !== undefined && { name }),
      updatedAt: new Date().toISOString(),
    };
    saveStatuses(all.map((s) => (s.id === id ? status : s)));
    statusChannel.postMessage(status.projectId);
    return status;
  },

  async remove(id) {
    await delay();
    const all = loadAllStatuses();
    const status = findStatusOrThrow(all, id);
    const taskCount = load().filter((t) => t.statusId === id).length;
    if (taskCount > 0) {
      throw new ApiError(
        409,
        `Move its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'} to another column first`,
      );
    }
    if (all.filter((s) => s.projectId === status.projectId).length <= 1) {
      throw new ApiError(409, 'A board needs at least one column');
    }
    saveStatuses(all.filter((s) => s.id !== id));
    statusChannel.postMessage(status.projectId);
    return status;
  },

  subscribe(onChange) {
    const listener = (message: MessageEvent<number>) => onChange(message.data);
    statusChannel.addEventListener('message', listener);
    return () => statusChannel.removeEventListener('message', listener);
  },
};

const EPICS_KEY = 'project-hub.mock.epics';
const epicChannel = new BroadcastChannel('project-hub.mock.epic-events');

function loadAllEpics(): Epic[] {
  try {
    return JSON.parse(localStorage.getItem(EPICS_KEY) ?? '[]') as Epic[];
  } catch {
    return [];
  }
}

function saveEpics(epics: Epic[]): void {
  localStorage.setItem(EPICS_KEY, JSON.stringify(epics));
}

function findEpicOrThrow(epics: Epic[], id: number): Epic {
  const epic = epics.find((e) => e.id === id);
  if (!epic) throw new ApiError(404, `Epic with ID ${id} not found`);
  return epic;
}

function assertEpicNameFree(
  epics: Epic[],
  projectId: number,
  name: string,
  exceptId?: number,
): void {
  const taken = epics.some(
    (e) =>
      e.projectId === projectId &&
      e.id !== exceptId &&
      e.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) {
    throw new ApiError(409, `There is already an epic named "${name}"`);
  }
}

// `YYYY-MM-DD` strings compare correctly as text.
function assertDatesInOrder(epic: Pick<Epic, 'startDate' | 'endDate'>): void {
  if (epic.startDate && epic.endDate && epic.endDate < epic.startDate) {
    throw new ApiError(400, 'endDate cannot be before startDate');
  }
}

/** Mirrors the API's rules: unique names, dates in order, deleting frees the epic's tasks. */
export const mockEpicsApi: EpicsApi = {
  async list(projectId) {
    await delay();
    return loadAllEpics()
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => a.position - b.position || a.id - b.id);
  },

  async create(projectId, input) {
    await delay();
    const all = loadAllEpics();
    const name = input.name.trim();
    assertEpicNameFree(all, projectId, name);
    const now = new Date().toISOString();
    const epic: Epic = {
      id: Math.max(0, ...all.map((e) => e.id)) + 1,
      projectId,
      name,
      description: input.description ?? null,
      color: input.color ?? 'slate',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      // A new epic goes to the end of the bar.
      position:
        Math.max(
          0,
          ...all.filter((e) => e.projectId === projectId).map((e) => e.position),
        ) + POSITION_STEP,
      createdAt: now,
      updatedAt: now,
    };
    assertDatesInOrder(epic);
    saveEpics([...all, epic]);
    epicChannel.postMessage(projectId);
    return epic;
  },

  async update(id, input) {
    await delay();
    const all = loadAllEpics();
    const current = findEpicOrThrow(all, id);
    const name = input.name?.trim();
    if (name !== undefined) assertEpicNameFree(all, current.projectId, name, id);
    const epic: Epic = {
      ...current,
      ...input,
      ...(name !== undefined && { name }),
      updatedAt: new Date().toISOString(),
    };
    assertDatesInOrder(epic);
    saveEpics(all.map((e) => (e.id === id ? epic : e)));
    epicChannel.postMessage(epic.projectId);
    return epic;
  },

  async remove(id) {
    await delay();
    const all = loadAllEpics();
    const epic = findEpicOrThrow(all, id);
    saveEpics(all.filter((e) => e.id !== id));
    // Like the API's ON DELETE SET NULL: the tasks stay, without an epic.
    const tasks = load();
    if (tasks.some((t) => t.epicId === id)) {
      save(tasks.map((t) => (t.epicId === id ? { ...t, epicId: null } : t)));
      channel.postMessage(epic.projectId);
    }
    epicChannel.postMessage(epic.projectId);
    return epic;
  },

  subscribe(onChange) {
    const listener = (message: MessageEvent<number>) => onChange(message.data);
    epicChannel.addEventListener('message', listener);
    return () => epicChannel.removeEventListener('message', listener);
  },
};
