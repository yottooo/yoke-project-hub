import { socket } from '@/lib/socket';
import { api } from './client';
import { mockTasksApi } from './mocks';
import type { CreateTaskInput, Task, UpdateTaskInput } from './types';

export interface TasksApi {
  list(projectId: number): Promise<Task[]>;
  create(projectId: number, input: CreateTaskInput): Promise<Task>;
  update(id: number, input: UpdateTaskInput): Promise<Task>;
  remove(id: number): Promise<Task>;
  /**
   * Calls `onChange` with a project's id whenever someone else changes one
   * of its tasks. Returns a function that stops listening.
   */
  subscribe(onChange: (projectId: number) => void): () => void;
}

const realTasksApi: TasksApi = {
  list: (projectId) => api<Task[]>(`/projects/${projectId}/tasks`),
  create: (projectId, input) =>
    api<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: input }),
  update: (id, input) =>
    api<Task>(`/tasks/${id}`, { method: 'PATCH', body: input }),
  remove: (id) => api<Task>(`/tasks/${id}`, { method: 'DELETE' }),

  subscribe(onChange) {
    // All three events carry the projectId, which is all that is needed.
    const notify = (payload: { projectId: number }) =>
      onChange(payload.projectId);
    socket.on('taskCreated', notify);
    socket.on('taskUpdated', notify);
    socket.on('taskDeleted', notify);
    return () => {
      socket.off('taskCreated', notify);
      socket.off('taskUpdated', notify);
      socket.off('taskDeleted', notify);
    };
  },
};

export const USE_MOCK_TASKS = import.meta.env.VITE_MOCK_TASKS === 'true';

export const tasksApi: TasksApi = USE_MOCK_TASKS ? mockTasksApi : realTasksApi;
