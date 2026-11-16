import { useEffect, useState } from 'react';
import { PencilIcon, Plus } from 'lucide-react';
import type { Epic } from '@/api/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STATUS_COLOR_CLASSES } from './columns';
import { formatEpicDates, isOverdue, localToday } from './epicProgress';

/** What the board shows: every task (null), tasks without an epic ('none'), or one epic's tasks. */
export type EpicFilter = number | 'none' | null;

export interface EpicProgress {
  done: number;
  total: number;
}

interface EpicBarProps {
  epics: Epic[];
  selectedEpic: EpicFilter;
  onSelect: (value: EpicFilter) => void;
  onEdit: (epic: Epic) => void;
  onCreate: () => void;
  /** Done and total tasks per epic id; shown on each chip when given. */
  progress?: Map<number, EpicProgress>;
}

/** Today's local date, refreshed each minute, so "Overdue" turns on at midnight in an idle tab. */
function useToday(): string {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const timer = setInterval(() => setToday(localToday()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

const chipClass = (selected: boolean) =>
  cn(
    'flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
    selected
      ? 'border-foreground bg-foreground text-background'
      : 'bg-background hover:bg-muted',
  );

/** The project's epics as filter chips above the board, plus "+ Epic". */
export function EpicBar({
  epics,
  selectedEpic,
  onSelect,
  onEdit,
  onCreate,
  progress,
}: EpicBarProps) {
  const today = useToday();
  return (
    <nav
      aria-label="Epics"
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b px-6 py-2"
    >
      <button
        type="button"
        aria-pressed={selectedEpic === null}
        className={chipClass(selectedEpic === null)}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {epics.map((epic) => {
        const selected = selectedEpic === epic.id;
        const stats = progress?.get(epic.id);
        const percent =
          stats && stats.total > 0
            ? Math.round((stats.done / stats.total) * 100)
            : 0;
        const dates = formatEpicDates(epic, today);
        // Only judged once progress is known, so a loading board doesn't flash "overdue".
        const overdue = progress !== undefined && isOverdue(epic, stats, today);
        return (
          <div key={epic.id} className="group relative flex shrink-0">
            <button
              type="button"
              aria-pressed={selected}
              title={epic.description ?? undefined}
              className={cn(chipClass(selected), 'pr-8')}
              onClick={() => onSelect(selected ? null : epic.id)}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  STATUS_COLOR_CLASSES[epic.color].dot,
                )}
              />
              <span className="max-w-48 truncate">{epic.name}</span>
              {dates && (
                <span
                  className={cn(
                    'text-xs',
                    overdue
                      ? cn('font-medium', selected ? 'text-red-300' : 'text-destructive')
                      : 'opacity-70',
                  )}
                >
                  {dates}
                  {overdue && <span className="sr-only"> (overdue)</span>}
                </span>
              )}
              {overdue && (
                <span
                  aria-hidden
                  title="Past its end date and not finished"
                  className={cn(
                    'text-xs font-medium',
                    selected ? 'text-red-300' : 'text-destructive',
                  )}
                >
                  Overdue
                </span>
              )}
              {stats && (
                <span className="flex items-center gap-1.5 text-xs opacity-70">
                  <span
                    aria-hidden
                    className="h-1 w-10 overflow-hidden rounded-full bg-current/20"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        STATUS_COLOR_CLASSES[epic.color].dot,
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span>
                    {stats.done}/{stats.total}
                  </span>
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={`Edit epic ${epic.name}`}
              className={cn(
                'absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full opacity-60 hover:opacity-100 focus-visible:opacity-100',
                selected ? 'text-background' : 'text-muted-foreground',
              )}
              onClick={() => onEdit(epic)}
            >
              <PencilIcon className="size-3.5" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-pressed={selectedEpic === 'none'}
        className={chipClass(selectedEpic === 'none')}
        onClick={() => onSelect(selectedEpic === 'none' ? null : 'none')}
      >
        No epic
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={onCreate}
      >
        <Plus /> Epic
      </Button>
    </nav>
  );
}
