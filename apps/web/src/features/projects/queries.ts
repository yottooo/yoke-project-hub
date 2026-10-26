import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { CreateProjectInput } from '@/api/types';
import { socket } from '@/lib/socket';

// ['projects'] holds the list and ['projects', id] one project; invalidating ['projects'] reloads both.
const PROJECTS_KEY = ['projects'] as const;

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: projectsApi.list });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: () => projectsApi.get(id),
    // A project that does not exist will not appear on a second try.
    retry: false,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}
/** Reloads projects on change events; a no-op until the API sends them (docs/backend-next-steps.md, step 4). */
export function useLiveProjects(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const reload = () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    };

    socket.on('projectCreated', reload);
    socket.on('projectUpdated', reload);
    socket.on('projectRemoved', reload);
    return () => {
      socket.off('projectCreated', reload);
      socket.off('projectUpdated', reload);
      socket.off('projectRemoved', reload);
    };
  }, [queryClient]);
}
