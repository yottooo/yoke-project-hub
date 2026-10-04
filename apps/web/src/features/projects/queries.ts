import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import type { CreateProjectInput } from '@/api/types';
import { socket } from '@/lib/socket';

// The list is cached under ['projects'] and one project under
// ['projects', id]. Invalidating ['projects'] reloads both kinds.
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

/**
 * Reloads the projects when the API announces that one changed. The API does
 * not send these events yet (docs/backend-next-steps.md, step 4), so until
 * then this does nothing.
 */
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
