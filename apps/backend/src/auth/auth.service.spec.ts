import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockTokenService = {
    createAccessToken: jest.fn(),
    createRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
    accessExpiresInMs: 15 * 60 * 1000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('cartech_refresh_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should create session and return access token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        passwordHash: 'hashed_password',
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.authSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'placeholder',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockTokenService.createRefreshToken.mockResolvedValue('refreshed_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_refresh');
      mockPrisma.authSession.update.mockResolvedValue({});
      mockTokenService.createAccessToken.mockResolvedValue('access_token');

      const result = await service.login({ username: 'admin', password: 'password' });

      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refreshed_token');
      expect(result.user).toEqual({
        id: 'user-1',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'admin', passwordHash: 'hash', role: 'ADMIN' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ username: 'unknown', password: 'pwd' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and update hash', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sessionId: 'session-1', type: 'refresh' });
      mockPrisma.authSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'old_hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: { id: 'user-1', username: 'admin', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.createRefreshToken.mockResolvedValue('new_refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      mockPrisma.authSession.update.mockResolvedValue({});
      mockTokenService.createAccessToken.mockResolvedValue('new_access_token');

      const result = await service.refresh('old_token');

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
    });

    it('should revoke session on token reuse and throw 401', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sessionId: 'session-1', type: 'refresh' });
      mockPrisma.authSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        refreshTokenHash: 'old_hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: { id: 'user-1', username: 'admin', role: 'ADMIN' },
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('reused_token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.authSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('should revoke session when given valid token', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: 'user-1', sessionId: 'session-1', type: 'refresh' });
      mockPrisma.authSession.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some_token');

      expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not throw if no refresh token provided', async () => {
      await expect(service.logout(undefined)).resolves.not.toThrow();
    });
  });

  describe('getMe', () => {
    it('should return user without passwordHash', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      });

      const result = await service.getMe('user-1');

      expect(result).toEqual({
        id: 'user-1',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});