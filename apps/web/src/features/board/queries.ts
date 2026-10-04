import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/api/tasks';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@/api/types';
import { socket } from '@/lib/socket';

// One rule keeps the board correct: whenever tasks change, by us or by
// someone else, the list is reloaded from the API. The only shortcut is in
// useUpdateTask, which shows our own change before the API confirms it.

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

  useEffect(() => {
    const reload = () => {
      void queryClient.invalidateQueries({ queryKey: tasksKey(projectId) });
    };

    const unsubscribe = tasksApi.subscribe((changedProjectId) => {
      if (changedProjectId === projectId) reload();
    });
    // Changes made while the socket was down were missed, so reload once it
    // is back.
    socket.io.on('reconnect', reload);

    return () => {
      unsubscribe();
      socket.io.off('reconnect', reload);
    };
  }, [projectId, queryClient]);
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
    // Optimistic update: put the change into the cached list right away, so
    // a dragged card stays where it was dropped instead of jumping back until
    // the API answers.
    onMutate: async ({ id, input }) => {
      // A reload that is still on its way would overwrite the change.
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Task[]>(queryKey, (tasks) =>
        tasks?.map((task) => (task.id === id ? { ...task, ...input } : task)),
      );
    },
    // Runs after success and after an error. After an error, this reload is
    // what puts the card back.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
