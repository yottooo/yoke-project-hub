import type { Task, TaskStatus } from '@/api/types';
import { statusIdFromDragId, type ColumnDragId } from './columns';

// Columns sort by `position`; a move only gives the moved task a value between its new neighbours.

const POSITION_STEP = 1000;

/** One column's tasks in display order. */
export function tasksInColumn(tasks: Task[], statusId: number): Task[] {
  return tasks
    .filter((task) => task.statusId === statusId)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}

/** A position between two neighbours, either of which may be missing at a column's edge. */
export function positionBetween(
  before: number | undefined,
  after: number | undefined,
): number {
  if (before === undefined) {
    return after === undefined ? POSITION_STEP : after - POSITION_STEP;
  }
  if (after === undefined) return before + POSITION_STEP;
  return (before + after) / 2;
}

/** Where a dropped card lands, or null: on a task it takes that slot, on a column it goes last. */
export function resolveDrop(
  tasks: Task[],
  activeId: number,
  overId: number | ColumnDragId,
): { statusId: number; position: number } | null {
  const active = tasks.find((task) => task.id === activeId);
  const overTask = tasks.find((task) => task.id === overId);
  if (!active || overId === activeId) return null;

  let statusId: number;
  if (typeof overId === 'number') {
    if (!overTask) return null;
    statusId = overTask.statusId;
  } else {
    statusId = statusIdFromDragId(overId);
  }

  const column = tasksInColumn(tasks, statusId);
  const others = column.filter((task) => task.id !== activeId);
  const sameColumn = active.statusId === statusId;

  // Index in `others` at which the card is inserted.
  let index = others.length;
  if (overTask) {
    // Same column: match the drag preview. Other column: land just above the hovered card.
    index = (sameColumn ? column : others).indexOf(overTask);
  }

  const before: Task | undefined = others[index - 1];
  const after: Task | undefined = others[index];

  if (sameColumn) {
    // Same neighbours as before: the card did not really move.
    const current = column.indexOf(active);
    const prev: Task | undefined = column[current - 1];
    const next: Task | undefined = column[current + 1];
    if (prev?.id === before?.id && next?.id === after?.id) return null;
  }

  return {
    statusId,
    position: positionBetween(before?.position, after?.position),
  };
}

/** The new position of a column moved to `toIndex` among the sorted columns, or null if it stays. */
export function columnPositionAt(
  statuses: TaskStatus[],
  statusId: number,
  toIndex: number,
): number | null {
  const fromIndex = statuses.findIndex((status) => status.id === statusId);
  if (fromIndex === -1 || toIndex === fromIndex) return null;
  if (toIndex < 0 || toIndex >= statuses.length) return null;

  const others = statuses.filter((status) => status.id !== statusId);
  return positionBetween(
    others[toIndex - 1]?.position,
    others[toIndex]?.position,
  );
}
