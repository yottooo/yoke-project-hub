import { socket } from '@/lib/socket';
import { api } from './client';
import { mockStatusesApi } from './mocks';
import { USE_MOCK_TASKS } from './tasks';
import type { CreateStatusInput, TaskStatus, UpdateStatusInput } from './types';

export interface StatusesApi {
  list(projectId: number): Promise<TaskStatus[]>;
  create(projectId: number, input: CreateStatusInput): Promise<TaskStatus>;
  update(id: number, input: UpdateStatusInput): Promise<TaskStatus>;
  /** Fails with 409 while the column has tasks, or if it is the last one. */
  remove(id: number): Promise<TaskStatus>;
  /** Calls `onChange` when someone else changes a project's columns; returns an unsubscribe. */
  subscribe(onChange: (projectId: number) => void): () => void;
}

const realStatusesApi: StatusesApi = {
  list: (projectId) => api<TaskStatus[]>(`/projects/${projectId}/statuses`),
  create: (projectId, input) =>
    api<TaskStatus>(`/projects/${projectId}/statuses`, {
      method: 'POST',
      body: input,
    }),
  update: (id, input) =>
    api<TaskStatus>(`/statuses/${id}`, { method: 'PATCH', body: input }),
  remove: (id) => api<TaskStatus>(`/statuses/${id}`, { method: 'DELETE' }),

  subscribe(onChange) {
    // All three events carry the projectId, which is all that is needed.
    const notify = (payload: { projectId: number }) =>
      onChange(payload.projectId);
    socket.on('statusCreated', notify);
    socket.on('statusUpdated', notify);
    socket.on('statusDeleted', notify);
    return () => {
      socket.off('statusCreated', notify);
      socket.off('statusUpdated', notify);
      socket.off('statusDeleted', notify);
    };
  },
};

// Columns and tasks reference each other, so they share the tasks mock flag.
export const statusesApi: StatusesApi = USE_MOCK_TASKS
  ? mockStatusesApi
  : realStatusesApi;
