import { Request } from 'express';

// What we put inside the token. `sub` (subject) is the standard JWT claim for "who this token is for".
export interface JwtPayload {
  sub: number;
  email: string;
}

// A request that has passed AuthGuard, so `user` is always set
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
