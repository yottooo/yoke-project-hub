import { api } from './client';
import { mockAuthApi } from './mocks';
import type { AuthSession, LoginInput } from './types';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthSession>;
}

const realAuthApi: AuthApi = {
  login: (input) =>
    api<AuthSession>('/auth/login', { method: 'POST', body: input }),
};

export const USE_MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true';

export const authApi: AuthApi = USE_MOCK_AUTH ? mockAuthApi : realAuthApi;
