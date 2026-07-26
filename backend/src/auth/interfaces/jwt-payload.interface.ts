export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}