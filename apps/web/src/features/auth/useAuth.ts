import { useSyncExternalStore } from 'react';
import { authApi } from '@/api/auth';
import { getSession, setSession, subscribeSession } from '@/api/session';
import type { LoginInput, RegisterInput } from '@/api/types';
import { queryClient } from '@/lib/queryClient';

/** The signed-in user, or null. Re-renders on login and logout, in any tab. */
export function useAuth() {
  const session = useSyncExternalStore(subscribeSession, getSession);
  return { user: session?.user ?? null };
}

export async function login(input: LoginInput): Promise<void> {
  setSession(await authApi.login(input));
}

/** Creates the account, then signs in with the same credentials. */
export async function register(input: RegisterInput): Promise<void> {
  await authApi.register(input);
  await login({ email: input.email, password: input.password });
}

export function logout(): void {
  setSession(null);
  // Cached data belongs to the user who just left.
  queryClient.clear();
}
