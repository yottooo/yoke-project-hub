import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { Task, TaskStatus } from '@/api/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BoardColumnDef } from './columns';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  column: BoardColumnDef;
  /** This column's tasks, already in display order. */
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function BoardColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}: BoardColumnProps) {
  // The whole column is a drop target, so a card can be dropped below the
  // last one or into an empty column.
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <section
      ref={setNodeRef}
      aria-label={column.title}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/60 p-3 ring-2 ring-transparent transition-shadow',
        isOver && 'ring-ring/60',
      )}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          {column.title}
          <span className="ml-2 text-muted-foreground">{tasks.length}</span>
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Add a task to ${column.title}`}
          onClick={() => onAddTask(column.status)}
        >
          <Plus />
        </Button>
      </header>

      {/* Makes the cards of this column reorderable by dragging. */}
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-16 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
          {tasks.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No tasks
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
