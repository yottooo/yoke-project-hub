import { useEffect, useState } from 'react';
import { Loader2Icon, TrashIcon, XIcon } from 'lucide-react';
import type { Task } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { positionBetween, tasksInColumn } from './position';
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from './queries';
import { useStatuses } from './statusQueries';

// How long the delete confirmation stays open before it closes on its own.
const CONFIRM_TIMEOUT_MS = 4000;

interface TaskDialogProps {
  projectId: number;
  /** The task to edit. Leave out to create a new one. */
  task?: Task;
  /** Column a new task starts in; leave out for the leftmost one. */
  defaultStatusId?: number;
  onClose: () => void;
}

export function TaskDialog({
  projectId,
  task,
  defaultStatusId,
  onClose,
}: TaskDialogProps) {
  const tasks = useTasks(projectId);
  const statuses = useStatuses(projectId);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [statusId, setStatusId] = useState(
    task?.statusId ?? defaultStatusId ?? statuses.data?.[0]?.id,
  );
  const [assignee, setAssignee] = useState(task?.assignee ?? '');
  const [confirming, setConfirming] = useState(false);

  const error = createTask.error ?? updateTask.error ?? deleteTask.error;
  const busy =
    createTask.isPending || updateTask.isPending || deleteTask.isPending;

  useEffect(() => {
    if (!confirming || deleteTask.isPending) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming, deleteTask.isPending]);

  const save = () => {
    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      statusId,
      assignee: assignee.trim() || null,
    };

    if (!task) {
      createTask.mutate(fields, { onSuccess: onClose });
      return;
    }

    // A task moved to another column through this form lands at its bottom.
    const last =
      statusId === undefined
        ? undefined
        : tasksInColumn(tasks.data ?? [], statusId).at(-1);
    const position =
      statusId === task.statusId
        ? task.position
        : positionBetween(last?.position, undefined);
    updateTask.mutate(
      { id: task.id, input: { ...fields, position } },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          // Escape backs out of the delete confirmation before closing the dialog.
          if (confirming) {
            event.preventDefault();
            setConfirming(false);
          }
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <DialogHeader>
            <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              Changes show up right away on every open board.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              required
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                value={statusId ?? ''}
                onChange={(event) => setStatusId(Number(event.target.value))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {statuses.data?.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Input
                id="task-assignee"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <DialogFooter>
            {task &&
              (confirming ? (
                <div className="flex h-8 items-center gap-1.5 duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 sm:mr-auto">
                  <span className="text-xs text-muted-foreground">
                    Delete task?
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      deleteTask.mutate(task.id, {
                        onSuccess: onClose,
                        onError: () => setConfirming(false),
                      })
                    }
                  >
                    {deleteTask.isPending ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    autoFocus
                    aria-label="Cancel delete"
                    onClick={() => setConfirming(false)}
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="duration-150 animate-in fade-in-0 zoom-in-95 sm:mr-auto"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  Delete
                </Button>
              ))}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {task ? 'Save' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
