export interface LoginRequest {
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
