import { useState } from 'react';
import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type {
  Task,
  TaskStatus,
  UpdateStatusInput,
  UpdateTaskInput,
} from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BoardColumn, BoardColumnView, ColumnTitle } from './BoardColumn';
import { columnDragId, statusIdFromDragId, type ColumnDragId } from './columns';
import { columnPositionAt, resolveDrop, tasksInColumn } from './position';
import { TaskCardView } from './TaskCard';

const isColumnId = (id: UniqueIdentifier): id is ColumnDragId =>
  typeof id === 'string';

// A dragged column only meets other columns, nearest first. A dragged card: what's under
// the pointer wins (cards over columns); between columns, the nearest target.
const collisionDetection: CollisionDetection = (args) => {
  if (isColumnId(args.active.id)) {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) =>
        isColumnId(container.id),
      ),
    });
  }
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCorners(args);
};

interface BoardProps {
  tasks: Task[];
  /** The project's columns, left to right. */
  statuses: TaskStatus[];
  onMove: (id: number, input: UpdateTaskInput) => void;
  onTaskClick: (task: Task) => void;
  onAddTask: (statusId: number) => void;
  onAddStatus: (name: string, onSuccess: () => void) => void;
  onUpdateStatus: (id: number, input: UpdateStatusInput) => void;
  onDeleteStatus: (id: number) => void;
}

export function Board({
  tasks,
  statuses,
  onMove,
  onTaskClick,
  onAddTask,
  onAddStatus,
  onUpdateStatus,
  onDeleteStatus,
}: BoardProps) {
  // The card or column being dragged, if any.
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeTask = tasks.find((task) => task.id === activeId);
  const activeColumn = statuses.find(
    (status) => columnDragId(status.id) === activeId,
  );

  // Require a small move before dragging, so a plain click still opens the task.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const moveColumn = (statusId: number, toIndex: number) => {
    const position = columnPositionAt(statuses, statusId, toIndex);
    if (position !== null) onUpdateStatus(statusId, { position });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    if (isColumnId(active.id)) {
      const toIndex = statuses.findIndex(
        (status) => columnDragId(status.id) === over.id,
      );
      moveColumn(statusIdFromDragId(active.id), toIndex);
      return;
    }

    // Card ids are task ids (numbers), column ids are `status-{id}` strings.
    const taskId = active.id as number;
    const result = resolveDrop(tasks, taskId, over.id as number | ColumnDragId);
    if (result) onMove(taskId, result);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
        <SortableContext
          items={statuses.map((status) => columnDragId(status.id))}
          strategy={horizontalListSortingStrategy}
        >
          {statuses.map((status, index) => (
            <BoardColumn
              key={status.id}
              status={status}
              tasks={tasksInColumn(tasks, status.id)}
              index={index}
              columnCount={statuses.length}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onUpdate={(input) => onUpdateStatus(status.id, input)}
              onMove={(direction) => moveColumn(status.id, index + direction)}
              onDelete={() => onDeleteStatus(status.id)}
            />
          ))}
        </SortableContext>
        <AddColumn onAdd={onAddStatus} />
      </div>

      {/* The copy that follows the pointer. No drop animation: it would glide
          back to where the drag started, while the item is already in its new place. */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCardView
            task={activeTask}
            className="cursor-grabbing shadow-lg"
          />
        )}
        {activeColumn && (
          <BoardColumnView
            status={activeColumn}
            className="cursor-grabbing shadow-lg"
          >
            <ColumnTitle
              status={activeColumn}
              count={tasksInColumn(tasks, activeColumn.id).length}
            />
            {tasksInColumn(tasks, activeColumn.id).map((task) => (
              <TaskCardView key={task.id} task={task} />
            ))}
          </BoardColumnView>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** The "Add column" tile at the right end; Enter saves, Escape cancels. */
function AddColumn({
  onAdd,
}: {
  onAdd: (name: string, onSuccess: () => void) => void;
}) {
  const [name, setName] = useState<string | null>(null);

  if (name === null) {
    return (
      <Button
        variant="ghost"
        className="w-72 shrink-0 justify-start text-muted-foreground"
        onClick={() => setName('')}
      >
        <Plus /> Add column
      </Button>
    );
  }

  return (
    <form
      className="w-72 shrink-0 rounded-xl bg-muted/60 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed) onAdd(trimmed, () => setName(null));
      }}
    >
      <Input
        autoFocus
        aria-label="New column name"
        placeholder="Column name"
        maxLength={50}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setName(null);
        }}
        onBlur={() => {
          if (!name.trim()) setName(null);
        }}
      />
    </form>
  );
}
