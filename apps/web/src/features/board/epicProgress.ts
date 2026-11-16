import type { Epic, Task, TaskStatus } from '@/api/types';
import type { EpicFilter, EpicProgress } from './EpicBar';
import { sortStatuses } from './columns';

/**
 * Done and total tasks per epic. A task counts as done when it sits in the board's
 * rightmost column, since columns have no "done" flag. Every epic gets an entry, even
 * one without tasks, so the bar can show 0/0.
 */
export function epicProgress(
  epics: Epic[],
  tasks: Task[],
  statuses: TaskStatus[],
): Map<number, EpicProgress> {
  const doneStatusId = sortStatuses(statuses).at(-1)?.id;
  const progress = new Map<number, EpicProgress>(
    epics.map((epic) => [epic.id, { done: 0, total: 0 }]),
  );
  for (const task of tasks) {
    if (task.epicId === null) continue;
    const stats = progress.get(task.epicId);
    // A task can briefly point at an epic that's gone, until the task list reloads.
    if (!stats) continue;
    stats.total += 1;
    if (task.statusId === doneStatusId) stats.done += 1;
  }
  return progress;
}

/** Today as `YYYY-MM-DD` in the viewer's time zone, the form epic dates use. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Past its end date with work left. An epic without tasks has nothing done, so it
 * counts as unfinished too.
 */
export function isOverdue(
  epic: Epic,
  stats: EpicProgress | undefined,
  today = localToday(),
): boolean {
  if (!epic.endDate || epic.endDate >= today) return false;
  return !stats || stats.total === 0 || stats.done < stats.total;
}

// 'YYYY-MM-DD' → "16 Nov" (or "16 Nov 2027"); parsed by hand, since
// new Date('2026-11-16') means UTC midnight, the day before west of UTC.
function shortDay(day: string, withYear: boolean): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/**
 * "16 Nov – 15 Dec", "from 16 Nov", "until 15 Dec", or null without dates. Years are
 * shown when any date is outside the current year, so a range across years reads right.
 */
export function formatEpicDates(
  epic: Epic,
  today = localToday(),
): string | null {
  const { startDate, endDate } = epic;
  const thisYear = today.slice(0, 4);
  const withYear = [startDate, endDate].some(
    (day) => day !== null && day.slice(0, 4) !== thisYear,
  );
  const show = (day: string) => shortDay(day, withYear);
  if (startDate && endDate) return `${show(startDate)} – ${show(endDate)}`;
  if (startDate) return `from ${show(startDate)}`;
  if (endDate) return `until ${show(endDate)}`;
  return null;
}

/**
 * The filter the board applies. An epic id that no longer exists (deleted, or a stale
 * link) falls back to every task, once the epics have loaded.
 */
export function effectiveEpicFilter(
  filter: EpicFilter,
  epics: Epic[] | undefined,
): EpicFilter {
  if (typeof filter !== 'number' || !epics) return filter;
  return epics.some((epic) => epic.id === filter) ? filter : null;
}

/** The tasks a filter shows. */
export function filterTasksByEpic(tasks: Task[], filter: EpicFilter): Task[] {
  if (filter === null) return tasks;
  const epicId = filter === 'none' ? null : filter;
  return tasks.filter((task) => task.epicId === epicId);
}
