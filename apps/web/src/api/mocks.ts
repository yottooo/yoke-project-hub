// In-browser stand-ins for the API modules that do not exist yet: login and
// tasks. Data lives in localStorage. This file can be deleted once
// VITE_MOCK_AUTH and VITE_MOCK_TASKS are both false.

import type { AuthApi } from './auth';
import { ApiError } from './client';
import type { TasksApi } from './tasks';
import type { Task } from './types';

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
};

const STORAGE_KEY = 'project-hub.mock.tasks';
const POSITION_STEP = 1000;

// Stands in for the socket: tells the other tabs of this browser which
// project's tasks changed. A tab does not receive its own messages.
const channel = new BroadcastChannel('project-hub.mock.task-events');

// Read on every call, because another tab may have written since the last one.
function load(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Task[];
  } catch {
    return [];
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
    const status = input.status ?? 'todo';
    const now = new Date().toISOString();
    // A new task goes to the end of its column.
    const lastPosition = Math.max(
      0,
      ...tasks
        .filter((t) => t.projectId === projectId && t.status === status)
        .map((t) => t.position),
    );
    const task: Task = {
      id: Math.max(0, ...tasks.map((t) => t.id)) + 1,
      projectId,
      title: input.title,
      description: input.description ?? null,
      status,
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
    const task: Task = {
      ...findOrThrow(tasks, id),
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
