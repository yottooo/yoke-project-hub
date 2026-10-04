import type { Task, TaskStatus } from '@/api/types';

// Where a card sits. Each task has a `position` number, and a column shows
// its tasks sorted by it. Moving a card only changes that one task: it gets
// a position between its new neighbours.

const POSITION_STEP = 1000;

/** One column's tasks in display order. */
export function tasksInColumn(tasks: Task[], status: TaskStatus): Task[] {
  return tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}

/**
 * A position that sorts between two neighbours. Either may be missing, at
 * the top or the bottom of a column.
 */
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

/**
 * Where a dropped card ends up, or null when the drop changes nothing.
 * `overId` is what it was dropped on: a task id (the card takes that card's
 * slot) or a column's status (the card goes to the end of that column).
 */
export function resolveDrop(
  tasks: Task[],
  activeId: number,
  overId: number | TaskStatus,
): { status: TaskStatus; position: number } | null {
  const active = tasks.find((task) => task.id === activeId);
  const overTask = tasks.find((task) => task.id === overId);
  if (!active || overId === activeId) return null;

  let status: TaskStatus;
  if (typeof overId === 'number') {
    if (!overTask) return null;
    status = overTask.status;
  } else {
    status = overId;
  }

  const column = tasksInColumn(tasks, status);
  const others = column.filter((task) => task.id !== activeId);
  const sameColumn = active.status === status;

  // Index in `others` at which the card is inserted.
  let index = others.length;
  if (overTask) {
    // Within a column this matches the reordering the list previews while
    // dragging. From another column the card lands just above the hovered one.
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
    status,
    position: positionBetween(before?.position, after?.position),
  };
}
