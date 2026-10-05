import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectCard } from './ProjectCard';
import { useLiveProjects, useProjects } from './queries';

export function ProjectsPage() {
  const projects = useProjects();
  useLiveProjects();
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Pick a project to open its board.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New project
        </Button>
      </div>

      {projects.isPending && (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      )}

      {projects.isError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>Couldn’t load projects: {projects.error.message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void projects.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {projects.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No projects yet. Create the first one.
        </p>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {creating && <CreateProjectDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
