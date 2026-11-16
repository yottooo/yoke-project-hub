import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { epicsApi } from '@/api/epics';
import type { CreateEpicInput, Epic, UpdateEpicInput } from '@/api/types';

// The project's epics. Like columns, any change reloads the list; useUpdateEpic is optimistic.
// Deleting an epic also changes tasks (their epicId becomes null), so those reload the tasks too.

const epicsKey = (projectId: number) => ['epics', projectId] as const;
const tasksKey = (projectId: number) => ['tasks', projectId] as const;

function sortEpics(epics: Epic[]): Epic[] {
  return [...epics].sort((a, b) => a.position - b.position || a.id - b.id);
}

export function useEpics(projectId: number) {
  return useQuery({
    queryKey: epicsKey(projectId),
    queryFn: () => epicsApi.list(projectId),
    select: sortEpics,
  });
}

/** Reloads the epics, and the tasks that point at them, when someone else changes them. */
export function useLiveEpics(projectId: number): void {
  const queryClient = useQueryClient();

  // Reconnects are covered by AppLayout, which reloads every query on connect.
  useEffect(
    () =>
      epicsApi.subscribe((changedProjectId) => {
        if (changedProjectId === projectId) {
          void queryClient.invalidateQueries({ queryKey: epicsKey(projectId) });
          void queryClient.invalidateQueries({ queryKey: tasksKey(projectId) });
        }
      }),
    [projectId, queryClient],
  );
}

export function useCreateEpic(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEpicInput) => epicsApi.create(projectId, input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: epicsKey(projectId) }),
  });
}

export function useUpdateEpic(projectId: number) {
  const queryClient = useQueryClient();
  const queryKey = epicsKey(projectId);

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateEpicInput }) =>
      epicsApi.update(id, input),
    // Optimistic update: a renamed or recolored epic changes at once.
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Epic[]>(queryKey, (epics) =>
        epics?.map((epic) => (epic.id === id ? { ...epic, ...input } : epic)),
      );
    },
    // Runs after success or error; after an error, this reload puts the epic back.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteEpic(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => epicsApi.remove(id),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: epicsKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: tasksKey(projectId) }),
      ]),
  });
}
