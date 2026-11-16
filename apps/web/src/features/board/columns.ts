import type { StatusColor, TaskStatus } from '@/api/types';

/** Full class names per column color (Tailwind only sees whole strings): the header dot and top edge. */
export const STATUS_COLOR_CLASSES: Record<
  StatusColor,
  { dot: string; edge: string }
> = {
  slate: { dot: 'bg-slate-400', edge: 'border-t-slate-400' },
  blue: { dot: 'bg-blue-500', edge: 'border-t-blue-500' },
  green: { dot: 'bg-green-500', edge: 'border-t-green-500' },
  amber: { dot: 'bg-amber-500', edge: 'border-t-amber-500' },
  red: { dot: 'bg-red-500', edge: 'border-t-red-500' },
  purple: { dot: 'bg-purple-500', edge: 'border-t-purple-500' },
  pink: { dot: 'bg-pink-500', edge: 'border-t-pink-500' },
  teal: { dot: 'bg-teal-500', edge: 'border-t-teal-500' },
};

/** A project's columns, left to right. */
export function sortStatuses(statuses: TaskStatus[]): TaskStatus[] {
  return [...statuses].sort((a, b) => a.position - b.position || a.id - b.id);
}

// Drag ids: cards use their task id (a number), columns this string, so the two never collide.
export type ColumnDragId = `status-${number}`;

export function columnDragId(statusId: number): ColumnDragId {
  return `status-${statusId}`;
}

export function statusIdFromDragId(id: ColumnDragId): number {
  return Number(id.slice('status-'.length));
}
