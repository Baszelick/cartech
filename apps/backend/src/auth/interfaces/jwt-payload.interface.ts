import type { UserRole } from '../../../generated/prisma/client';

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  username: string;
  roles: UserRole[];
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}
