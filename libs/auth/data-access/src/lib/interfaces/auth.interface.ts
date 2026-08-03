export enum UserRole {
  SYSTEM_OWNER = 'SYSTEM_OWNER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  VIEWER = 'VIEWER',
}

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
