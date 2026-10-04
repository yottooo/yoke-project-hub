import { useState } from 'react';
import type { Task, TaskStatus } from '@/api/types';
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
import { BOARD_COLUMNS } from './columns';
import { positionBetween, tasksInColumn } from './position';
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
} from './queries';

interface TaskDialogProps {
  projectId: number;
  /** The task to edit. Leave out to create a new one. */
  task?: Task;
  /** Column a new task starts in. */
  defaultStatus?: TaskStatus;
  onClose: () => void;
}

export function TaskDialog({
  projectId,
  task,
  defaultStatus = 'todo',
  onClose,
}: TaskDialogProps) {
  const tasks = useTasks(projectId);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState(task?.status ?? defaultStatus);
  const [assignee, setAssignee] = useState(task?.assignee ?? '');

  const error = createTask.error ?? updateTask.error ?? deleteTask.error;
  const busy =
    createTask.isPending || updateTask.isPending || deleteTask.isPending;

  const save = () => {
    const fields = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      assignee: assignee.trim() || null,
    };

    if (!task) {
      createTask.mutate(fields, { onSuccess: onClose });
      return;
    }

    // A task moved to another column through this form goes to the bottom
    // of that column.
    const last = tasksInColumn(tasks.data ?? [], status).at(-1);
    const position =
      status === task.status
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
      <DialogContent>
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
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {BOARD_COLUMNS.map((column) => (
                  <option key={column.status} value={column.status}>
                    {column.title}
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
            {task && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Delete this task?')) {
                    deleteTask.mutate(task.id, { onSuccess: onClose });
                  }
                }}
              >
                Delete
              </Button>
            )}
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
