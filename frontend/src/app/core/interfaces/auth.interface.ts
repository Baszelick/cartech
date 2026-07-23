export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthUser {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface LoginResponse {
    accessToken: string;
    user: AuthUser
}