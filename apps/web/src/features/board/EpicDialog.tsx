import { useEffect, useState } from 'react';
import { CheckIcon, Loader2Icon, TrashIcon, XIcon } from 'lucide-react';
import { STATUS_COLORS, type Epic, type StatusColor } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { STATUS_COLOR_CLASSES } from './columns';
import { useCreateEpic, useDeleteEpic, useUpdateEpic } from './epicQueries';

// How long the delete confirmation stays open before it closes on its own.
const CONFIRM_TIMEOUT_MS = 4000;

interface EpicDialogProps {
  projectId: number;
  /** The epic to edit. Leave out to create a new one. */
  epic?: Epic;
  onClose: () => void;
  /** Called with a newly created epic, e.g. to select it. */
  onCreated?: (epic: Epic) => void;
}

export function EpicDialog({
  projectId,
  epic,
  onClose,
  onCreated,
}: EpicDialogProps) {
  const createEpic = useCreateEpic(projectId);
  const updateEpic = useUpdateEpic(projectId);
  const deleteEpic = useDeleteEpic(projectId);

  const [name, setName] = useState(epic?.name ?? '');
  const [description, setDescription] = useState(epic?.description ?? '');
  const [color, setColor] = useState<StatusColor>(epic?.color ?? 'slate');
  const [startDate, setStartDate] = useState(epic?.startDate ?? '');
  const [endDate, setEndDate] = useState(epic?.endDate ?? '');
  const [confirming, setConfirming] = useState(false);

  const error = createEpic.error ?? updateEpic.error ?? deleteEpic.error;
  const busy =
    createEpic.isPending || updateEpic.isPending || deleteEpic.isPending;
  // Caught here so the form says why before the API does.
  const datesOutOfOrder = Boolean(startDate && endDate && endDate < startDate);

  useEffect(() => {
    if (!confirming || deleteEpic.isPending) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming, deleteEpic.isPending]);

  const save = () => {
    const fields = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    if (!epic) {
      createEpic.mutate(fields, {
        onSuccess: (created) => {
          onCreated?.(created);
          onClose();
        },
      });
      return;
    }
    updateEpic.mutate({ id: epic.id, input: fields }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // A long description must not push the buttons off-screen.
        className="max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          // Escape backs out of the delete confirmation before closing the dialog.
          if (confirming) {
            event.preventDefault();
            setConfirming(false);
          }
        }}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <DialogHeader>
            <DialogTitle>{epic ? 'Edit epic' : 'New epic'}</DialogTitle>
            <DialogDescription>
              An epic groups the tasks that work toward one goal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="epic-name">Name</Label>
            <Input
              id="epic-name"
              required
              autoFocus
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="epic-description">Description</Label>
            <Textarea
              id="epic-description"
              rows={3}
              maxLength={2000}
              className="max-h-48"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label id="epic-color-label">Color</Label>
            <div
              role="radiogroup"
              aria-labelledby="epic-color-label"
              className="flex flex-wrap gap-2"
            >
              {STATUS_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={option === color}
                  aria-label={option}
                  title={option}
                  onClick={() => setColor(option)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    STATUS_COLOR_CLASSES[option].dot,
                    option === color && 'ring-2 ring-foreground',
                  )}
                >
                  {option === color && <CheckIcon className="size-4" />}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="epic-start">Start date</Label>
              <Input
                id="epic-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="epic-end">End date</Label>
              <Input
                id="epic-end"
                type="date"
                min={startDate || undefined}
                value={endDate}
                aria-invalid={datesOutOfOrder || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          {datesOutOfOrder && (
            <p role="alert" className="text-sm text-destructive">
              The end date cannot be before the start date.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <DialogFooter>
            {epic &&
              (confirming ? (
                <div className="flex h-8 items-center gap-1.5 duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 sm:mr-auto">
                  <span className="text-xs text-muted-foreground">
                    Delete epic? Its tasks stay.
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      deleteEpic.mutate(epic.id, {
                        onSuccess: onClose,
                        onError: () => setConfirming(false),
                      })
                    }
                  >
                    {deleteEpic.isPending ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busy}
                    autoFocus
                    aria-label="Cancel delete"
                    onClick={() => setConfirming(false)}
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="duration-150 animate-in fade-in-0 zoom-in-95 sm:mr-auto"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  Delete
                </Button>
              ))}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || datesOutOfOrder}>
              {epic ? 'Save' : 'Create epic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
