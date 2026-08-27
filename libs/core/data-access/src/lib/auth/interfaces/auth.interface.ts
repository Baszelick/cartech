import type { UserRole } from '../../users';

export interface LoginRequest {
  companyCode: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

export interface CurrentUser {
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
  user: CurrentUser;
}
