import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import type { TaskStatus } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ChatWidget } from '@/features/chat/ChatWidget';
import { useProject } from '@/features/projects/queries';
import { useProjectRoom } from '@/lib/socket';
import { Board } from './Board';
import { useLiveTasks, useTasks, useUpdateTask } from './queries';
import { TaskDialog } from './TaskDialog';

/** Which dialog is open: a new task, an existing one, or none. */
type DialogState =
  | { mode: 'create'; status: TaskStatus }
  | { mode: 'edit'; taskId: number }
  | null;

function ProjectUnavailable({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">Couldn’t open this project</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link to="/projects" className="text-sm underline underline-offset-4">
        Back to projects
      </Link>
    </div>
  );
}

function ProjectBoard({ projectId }: { projectId: number }) {
  const project = useProject(projectId);
  const tasks = useTasks(projectId);
  const updateTask = useUpdateTask(projectId);
  const [dialog, setDialog] = useState<DialogState>(null);

  // Live updates: join the project's room, and reload the tasks whenever
  // someone else changes them.
  useProjectRoom(projectId);
  useLiveTasks(projectId);

  if (project.isError) {
    return <ProjectUnavailable message={project.error.message} />;
  }

  // Looked up in the current list, so the dialog closes by itself if the
  // task is deleted in another tab.
  const editing =
    dialog?.mode === 'edit'
      ? tasks.data?.find((task) => task.id === dialog.taskId)
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3">
        <div className="min-w-0">
          <Link
            to="/projects"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Projects
          </Link>
          <h1 className="truncate text-lg font-semibold">
            {project.data?.name ?? 'Loading…'}
          </h1>
        </div>
        <Button onClick={() => setDialog({ mode: 'create', status: 'todo' })}>
          <Plus /> New task
        </Button>
      </div>

      {updateTask.error && (
        <p
          role="alert"
          className="shrink-0 bg-destructive/10 px-6 py-2 text-sm text-destructive"
        >
          Couldn’t save the change ({updateTask.error.message}). The board shows
          the saved state again.
        </p>
      )}

      {tasks.isPending && (
        <p className="p-6 text-sm text-muted-foreground">Loading tasks…</p>
      )}
      {tasks.isError && (
        <p role="alert" className="p-6 text-sm text-destructive">
          Couldn’t load tasks: {tasks.error.message}
        </p>
      )}
      {tasks.data && (
        <Board
          tasks={tasks.data}
          onMove={(id, input) => updateTask.mutate({ id, input })}
          onTaskClick={(task) => setDialog({ mode: 'edit', taskId: task.id })}
          onAddTask={(status) => setDialog({ mode: 'create', status })}
        />
      )}

      {dialog?.mode === 'create' && (
        <TaskDialog
          projectId={projectId}
          defaultStatus={dialog.status}
          onClose={() => setDialog(null)}
        />
      )}
      {editing && (
        <TaskDialog
          key={editing.id}
          projectId={projectId}
          task={editing}
          onClose={() => setDialog(null)}
        />
      )}

      <ChatWidget projectId={projectId} />
    </div>
  );
}

export function BoardPage() {
  const projectId = Number(useParams().projectId);

  if (!Number.isInteger(projectId)) {
    return <ProjectUnavailable message="That is not a valid project link." />;
  }
  // The key makes React start this component from scratch for each project,
  // so chat messages and open dialogs never carry over from another one.
  return <ProjectBoard key={projectId} projectId={projectId} />;
}
