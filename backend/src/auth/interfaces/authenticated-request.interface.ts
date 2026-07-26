import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}