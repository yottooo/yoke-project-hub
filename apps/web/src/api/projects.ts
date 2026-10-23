import { api } from './client';
import type { CreateProjectInput, Project } from './types';

export const projectsApi = {
  list: () => api<Project[]>('/projects'),
  get: (id: number) => api<Project>(`/projects/${id}`),
  create: (input: CreateProjectInput) =>
    api<Project>('/projects', { method: 'POST', body: input }),
  remove: (id: number) => api<Project>(`/projects/${id}`, { method: 'DELETE' }),
};
