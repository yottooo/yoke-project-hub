import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import { USE_MOCK_AUTH } from '@/api/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, useAuth } from './useAuth';

export function LoginPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useMutation({ mutationFn: login });

  // Also handles the moment login succeeds: the session store updates,
  // this component re-renders and redirects.
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/projects'} replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Yoke</CardTitle>
          <CardDescription>Sign in to see your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate({ email, password });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {loginMutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {loginMutation.error.message}
              </p>
            )}
            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
            {USE_MOCK_AUTH && (
              <p className="text-xs text-muted-foreground">
                Mock auth is on: any email and password work.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
