import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { statusesApi } from '@/api/statuses';
import type {
  CreateStatusInput,
  TaskStatus,
  UpdateStatusInput,
} from '@/api/types';
import { sortStatuses } from './columns';

// The board's columns. Like tasks, any change reloads the list; useUpdateStatus is optimistic.

const statusesKey = (projectId: number) => ['statuses', projectId] as const;

export function useStatuses(projectId: number) {
  return useQuery({
    queryKey: statusesKey(projectId),
    queryFn: () => statusesApi.list(projectId),
    select: sortStatuses,
  });
}

/** Reloads the columns when someone else changes them. */
export function useLiveStatuses(projectId: number): void {
  const queryClient = useQueryClient();

  // Reconnects are covered by AppLayout, which reloads every query on connect.
  useEffect(
    () =>
      statusesApi.subscribe((changedProjectId) => {
        if (changedProjectId === projectId) {
          void queryClient.invalidateQueries({
            queryKey: statusesKey(projectId),
          });
        }
      }),
    [projectId, queryClient],
  );
}

export function useCreateStatus(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStatusInput) =>
      statusesApi.create(projectId, input),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: statusesKey(projectId) }),
  });
}

export function useUpdateStatus(projectId: number) {
  const queryClient = useQueryClient();
  const queryKey = statusesKey(projectId);

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateStatusInput }) =>
      statusesApi.update(id, input),
    // Optimistic update: a dragged column stays put instead of jumping back until the API answers.
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<TaskStatus[]>(queryKey, (statuses) =>
        statuses?.map((status) =>
          status.id === id ? { ...status, ...input } : status,
        ),
      );
    },
    // Runs after success or error; after an error, this reload puts the column back.
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteStatus(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => statusesApi.remove(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: statusesKey(projectId) }),
  });
}
