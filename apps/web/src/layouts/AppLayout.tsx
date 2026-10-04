import { useEffect } from 'react';
import { Link, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout, useAuth } from '@/features/auth/useAuth';
import { socket, useSocketConnected } from '@/lib/socket';
import { cn } from '@/lib/utils';

function ConnectionStatus() {
  const connected = useSocketConnected();
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'size-2 rounded-full',
          connected ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
      />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}

/** Shell of every signed-in page: the top bar, with the page below it. */
export function AppLayout() {
  const { user } = useAuth();

  // The socket stays open for as long as a signed-in page is shown.
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <Link to="/projects" className="font-semibold">
          Yoke
        </Link>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {user?.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
