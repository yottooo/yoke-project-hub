import { useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router';
import type { Project, ProjectStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2Icon, TrashIcon, XIcon } from 'lucide-react';
import { useDeleteProject } from './queries';

const STATUS_VARIANT: Record<
  ProjectStatus,
  'default' | 'secondary' | 'outline'
> = {
  active: 'default',
  inactive: 'secondary',
  completed: 'outline',
};

// How long the delete confirmation stays open before it closes on its own.
const CONFIRM_TIMEOUT_MS = 4000;

// The whole card is a link, so clicks on its buttons must not reach it.
const stop = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export function ProjectCard({ project }: { project: Project }) {
  const members = project.team.length;
  const deleteProject = useDeleteProject();
  const error = deleteProject.error;
  const busy = deleteProject.isPending;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming || busy) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming, busy]);

  const handleAskDelete = (e: MouseEvent) => {
    stop(e);
    setConfirming(true);
  };

  const handleCancel = (e: MouseEvent) => {
    stop(e);
    setConfirming(false);
  };

  const handleDelete = (e: MouseEvent) => {
    stop(e);
    deleteProject.mutate(project.id, {
      onSettled: () => setConfirming(false),
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setConfirming(false);
    }
  };

  return (
    <Link
      to={`/projects/${project.id}`}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardAction>
            <Badge variant={STATUS_VARIANT[project.status]}>
              {project.status}
            </Badge>
          </CardAction>
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Owner: {project.owner} · {members}{' '}
          {members === 1 ? 'member' : 'members'}
        </CardContent>
        <CardContent className="flex items-center justify-end gap-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}
          {confirming ? (
            <div
              onKeyDown={handleKeyDown}
              className="flex h-8 items-center gap-1.5 duration-150 animate-in fade-in-0 zoom-in-95 slide-in-from-right-2"
            >
              <span className="text-xs text-muted-foreground">
                Delete project?
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={busy}
              >
                {busy ? <Loader2Icon className="animate-spin" /> : <TrashIcon />}
                Delete
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                disabled={busy}
                autoFocus
                aria-label="Cancel delete"
              >
                <XIcon />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={handleAskDelete}
              className="duration-150 animate-in fade-in-0 zoom-in-95"
              aria-label="Delete project"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
