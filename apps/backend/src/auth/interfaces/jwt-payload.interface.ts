import type { UserRole } from '../../../generated/prisma/client';

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  username: string;
  roles: UserRole[];
  mustChangePassword: boolean;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}
