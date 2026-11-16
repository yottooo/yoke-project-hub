import type { ComponentProps } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Epic, Task } from '@/api/types';
import { cn } from '@/lib/utils';
import { STATUS_COLOR_CLASSES } from './columns';

/** The card's looks only. Also what follows the pointer during a drag. */
export function TaskCardView({
  task,
  epic,
  className,
  ...props
}: { task: Task; epic?: Epic } & ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-lg bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/10',
        className,
      )}
      {...props}
    >
      <p className="font-medium wrap-break-word">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      {(epic || task.assignee) && (
        <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {epic && (
            <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
              <span
                aria-hidden
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  STATUS_COLOR_CLASSES[epic.color].dot,
                )}
              />
              <span className="truncate">{epic.name}</span>
            </span>
          )}
          {task.assignee && (
            <span className="truncate">@{task.assignee}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** A card in a column: draggable, and opens the task on click. */
export function TaskCard({
  task,
  epic,
  onClick,
}: {
  task: Task;
  epic?: Epic;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: task.id, data: { statusId: task.statusId } });

  // Same-column cards shift to preview a reorder; a card from another column needs a marker.
  const draggedFrom: number | undefined = active?.data.current?.statusId;
  const showInsertLine =
    isOver && active?.id !== task.id && draggedFrom !== task.statusId;

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      epic={epic}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'relative cursor-grab outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        isDragging && 'opacity-40',
        showInsertLine &&
          'before:absolute before:inset-x-0 before:-top-1.5 before:h-0.5 before:rounded-full before:bg-primary',
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onClick();
      }}
      {...attributes}
      {...listeners}
    />
  );
}
