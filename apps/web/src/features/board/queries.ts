import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/api/types';

// Any task change reloads the list from the API; useUpdateTask's optimistic update is the only shortcut.

const tasksKey = (projectId: number) => ['tasks', projectId] as const;

export function useTasks(projectId: number) {
  return useQuery({
    queryKey: tasksKey(projectId),
    queryFn: () => tasksApi.list(projectId),
  });
}

/** Reloads the task list when someone else changes a task of this project. */
export function useLiveTasks(projectId: number): void {
  const queryClient = useQueryClient();

  // Reconnects are covered by AppLayout, which reloads every query on connect.
  useEffect(
    () =>
      tasksApi.subscribe((changedProjectId) => {
        if (changedProjectId === projectId) {
          void queryClient.invalidateQueries({ queryKey: tasksKey(projectId) });
        }
      }),
    [projectId, queryClient],
  );
}

export function useCreateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(projectId, input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}

export function useDeleteTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: tasksKey(projectId) }),
  });
}

export function useUpdateTask(projectId: number) {
  const queryClient = useQueryClient();
  const queryKey = tasksKey(projectId);

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      tasksApi.update(id, input),
    // Optimistic update: a dropped card stays put instead of jumping back until the API answers.
    onMutate: async ({ id, input }) => {
      // A reload that is still on its way would overwrite the change.
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Task[]>(queryKey, (tasks) =>
        tasks?.map((task) => (task.id === id ? { ...task, ...input } : task)),
      );
    },
    // Runs after success or error; after an error, this reload puts the card back.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
