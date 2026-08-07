import { UserRole } from '@cartech/core/data-access';

export interface LoginRequest {
  companyCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser
}

export interface AuthUser {
  id: string;
  companyId: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  mustChangePassword: boolean;
}

export interface RefreshResponse {
  accessToken: string;
}
