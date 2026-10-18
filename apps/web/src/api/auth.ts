import { api } from './client';
import { mockAuthApi } from './mocks';
import type { AuthSession, LoginInput, RegisterInput, User } from './types';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
  /** Creates the account only; sign in afterwards to get a session. */
  register(input: RegisterInput): Promise<User>;
}

const realAuthApi: AuthApi = {
  login: (input) =>
    api<AuthSession>('/auth/login', { method: 'POST', body: input }),
  register: (input) =>
    api<User>('/auth/register', { method: 'POST', body: input }),
};

export const USE_MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true';

export const authApi: AuthApi = USE_MOCK_AUTH ? mockAuthApi : realAuthApi;
