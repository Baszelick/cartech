import { Request } from 'express';
import type { UserRole } from '../../../generated/prisma/client';

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  username: string;
  roles: UserRole[];
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
