import { socket } from '@/lib/socket';
import { api } from './client';
import { mockEpicsApi } from './mocks';
import { USE_MOCK_TASKS } from './tasks';
import type { CreateEpicInput, Epic, UpdateEpicInput } from './types';

export interface EpicsApi {
  list(projectId: number): Promise<Epic[]>;
  create(projectId: number, input: CreateEpicInput): Promise<Epic>;
  update(id: number, input: UpdateEpicInput): Promise<Epic>;
  /** Its tasks stay on the board, without an epic. */
  remove(id: number): Promise<Epic>;
  /** Calls `onChange` when someone else changes a project's epics; returns an unsubscribe. */
  subscribe(onChange: (projectId: number) => void): () => void;
}

const realEpicsApi: EpicsApi = {
  list: (projectId) => api<Epic[]>(`/projects/${projectId}/epics`),
  create: (projectId, input) =>
    api<Epic>(`/projects/${projectId}/epics`, { method: 'POST', body: input }),
  update: (id, input) =>
    api<Epic>(`/epics/${id}`, { method: 'PATCH', body: input }),
  remove: (id) => api<Epic>(`/epics/${id}`, { method: 'DELETE' }),

  subscribe(onChange) {
    // All three events carry the projectId, which is all that is needed.
    const notify = (payload: { projectId: number }) =>
      onChange(payload.projectId);
    socket.on('epicCreated', notify);
    socket.on('epicUpdated', notify);
    socket.on('epicDeleted', notify);
    return () => {
      socket.off('epicCreated', notify);
      socket.off('epicUpdated', notify);
      socket.off('epicDeleted', notify);
    };
  },
};

// Tasks point at epics, so epics share the tasks mock flag.
export const epicsApi: EpicsApi = USE_MOCK_TASKS ? mockEpicsApi : realEpicsApi;
