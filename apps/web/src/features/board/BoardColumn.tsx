import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Plus,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import {
  STATUS_COLORS,
  type StatusColor,
  type Task,
  type TaskStatus,
  type UpdateStatusInput,
} from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { columnDragId, STATUS_COLOR_CLASSES } from './columns';
import { TaskCard } from './TaskCard';

// How long the delete confirmation stays open before it closes on its own.
const CONFIRM_TIMEOUT_MS = 4000;

/** The column's frame: colored top edge, header slot and body. Also what follows the pointer during a column drag. */
export function BoardColumnView({
  status,
  className,
  children,
  ...props
}: { status: TaskStatus } & ComponentProps<'section'>) {
  return (
    <section
      aria-label={status.name}
      className={cn(
        'flex w-72 shrink-0 flex-col gap-3 rounded-xl border-t-4 bg-muted/60 p-3 ring-2 ring-transparent transition-shadow',
        STATUS_COLOR_CLASSES[status.color].edge,
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/** The dot and name shown in a column's header. */
export function ColumnTitle({
  status,
  count,
}: {
  status: TaskStatus;
  count: number;
}) {
  return (
    <h2 className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full',
          STATUS_COLOR_CLASSES[status.color].dot,
        )}
      />
      <span className="truncate">{status.name}</span>
      <span className="text-muted-foreground">{count}</span>
    </h2>
  );
}

interface BoardColumnProps {
  status: TaskStatus;
  /** This column's tasks, already in display order. */
  tasks: Task[];
  /** Where the column sits, to disable moving past either end. */
  index: number;
  columnCount: number;
  onTaskClick: (task: Task) => void;
  onAddTask: (statusId: number) => void;
  onUpdate: (input: UpdateStatusInput) => void;
  /** Moves the column one place left (-1) or right (1). */
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

export function BoardColumn({
  status,
  tasks,
  index,
  columnCount,
  onTaskClick,
  onAddTask,
  onUpdate,
  onMove,
  onDelete,
}: BoardColumnProps) {
  // Sortable among the columns, by its grip; the whole column is also where cards drop.
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: columnDragId(status.id), data: { type: 'column' } });
  const cardOver = isOver && typeof active?.id === 'number';

  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  // Why the column can't be deleted, if it can't.
  const deleteBlocker =
    tasks.length > 0
      ? `Move its ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} out first`
      : columnCount <= 1
        ? 'A board needs at least one column'
        : null;

  return (
    <BoardColumnView
      ref={setNodeRef}
      status={status}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(cardOver && 'ring-ring/60', isDragging && 'opacity-40')}
    >
      <header className="flex items-center gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Drag to reorder ${status.name}`}
          className="-ml-1 cursor-grab rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {renaming ? (
          <RenameInput
            initial={status.name}
            onDone={(name) => {
              setRenaming(false);
              if (name && name !== status.name) onUpdate({ name });
            }}
          />
        ) : (
          <button
            type="button"
            title="Rename"
            className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => setRenaming(true)}
          >
            <ColumnTitle status={status} count={tasks.length} />
          </button>
        )}

        {confirming ? (
          <div className="flex items-center gap-1 duration-150 animate-in fade-in-0 zoom-in-95">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              <TrashIcon /> Delete
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              autoFocus
              aria-label="Cancel delete"
              onClick={() => setConfirming(false)}
            >
              <XIcon />
            </Button>
          </div>
        ) : (
          <>
            <ColumnMenu
              status={status}
              canMoveLeft={index > 0}
              canMoveRight={index < columnCount - 1}
              deleteBlocker={deleteBlocker}
              onRename={() => setRenaming(true)}
              onColor={(color) => onUpdate({ color })}
              onMove={onMove}
              onDelete={() => setConfirming(true)}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Add a task to ${status.name}`}
              onClick={() => onAddTask(status.id)}
            >
              <Plus />
            </Button>
          </>
        )}
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
    </BoardColumnView>
  );
}

/** Enter or leaving the field saves; Escape cancels. Calls `onDone` with the trimmed name, or null. */
function RenameInput({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [name, setName] = useState(initial);

  return (
    <Input
      autoFocus
      aria-label="Column name"
      maxLength={50}
      value={name}
      className="h-7 flex-1"
      onFocus={(event) => event.target.select()}
      onChange={(event) => setName(event.target.value)}
      onBlur={() => onDone(name.trim() || null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setName(initial);
          onDone(null);
        }
      }}
    />
  );
}

function ColumnMenu({
  status,
  canMoveLeft,
  canMoveRight,
  deleteBlocker,
  onRename,
  onColor,
  onMove,
  onDelete,
}: {
  status: TaskStatus;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  deleteBlocker: string | null;
  onRename: () => void;
  onColor: (color: StatusColor) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  // Set by Rename and Delete, so closing the menu leaves focus in the field or confirm they show.
  const keepFocus = useRef(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${status.name} column options`}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onCloseAutoFocus={(event) => {
          if (keepFocus.current) event.preventDefault();
          keepFocus.current = false;
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            keepFocus.current = true;
            onRename();
          }}
        >
          <PencilIcon /> Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span
              aria-hidden
              className={cn(
                'size-3 rounded-full',
                STATUS_COLOR_CLASSES[status.color].dot,
              )}
            />
            Color
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {STATUS_COLORS.map((color) => (
              <DropdownMenuItem key={color} onSelect={() => onColor(color)}>
                <span
                  aria-hidden
                  className={cn(
                    'size-3 rounded-full',
                    STATUS_COLOR_CLASSES[color].dot,
                  )}
                />
                <span className="capitalize">{color}</span>
                {color === status.color && <CheckIcon className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem disabled={!canMoveLeft} onSelect={() => onMove(-1)}>
          <ArrowLeftIcon /> Move left
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveRight} onSelect={() => onMove(1)}>
          <ArrowRightIcon /> Move right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={deleteBlocker !== null}
          onSelect={() => {
            keepFocus.current = true;
            onDelete();
          }}
        >
          <TrashIcon />
          <span className="flex flex-col">
            Delete column
            {deleteBlocker && (
              <span className="text-xs text-muted-foreground">
                {deleteBlocker}
              </span>
            )}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
