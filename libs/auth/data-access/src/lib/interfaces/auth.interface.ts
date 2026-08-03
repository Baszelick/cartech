export interface LoginRequest {
  companyId: string;
  username: string;
  password: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser
}

export interface AuthUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface MeResponse {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}
