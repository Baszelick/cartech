import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

jestRuntime.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma: any = {
    user: {
      findUnique: jestRuntime.fn(),
      findUniqueOrThrow: jestRuntime.fn(),
    },
    authSession: {
      create: jestRuntime.fn(),
      findUnique: jestRuntime.fn(),
      update: jestRuntime.fn(),
      updateMany: jestRuntime.fn(),
    },
  };

  const mockTokenService: any = {
    createAccessToken: jestRuntime.fn(),
    createRefreshToken: jestRuntime.fn(),
    verifyRefreshToken: jestRuntime.fn(),
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
    accessExpiresInMs: 15 * 60 * 1000,
  };

  const publicUser = {
    id: 'user-1',
    companyId: 'company-1',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['SYSTEM_OWNER'],
  };

  const databaseUser = {
    ...publicUser,
    passwordHash: 'hashed_password',
    isActive: true,
    roles: [{ role: 'SYSTEM_OWNER' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jestRuntime.clearAllMocks();

    const mockConfigService = {
      getOrThrow: jestRuntime.fn().mockReturnValue('cartech_refresh_token'),
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
    it('loads a company user with roles and creates a session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(databaseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.authSession.create.mockResolvedValue({
        id: 'session-1',
      });
      mockTokenService.createRefreshToken.mockResolvedValue('refresh_token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_refresh');
      mockPrisma.authSession.update.mockResolvedValue({});
      mockTokenService.createAccessToken.mockResolvedValue('access_token');

      const result = await service.login({
        companyId: 'company-1',
        username: 'admin',
        password: 'password',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          companyId_username: {
            companyId: 'company-1',
            username: 'admin',
          },
        },
        include: {
          roles: {
            select: {
              role: true,
            },
          },
        },
      });
      expect(mockTokenService.createAccessToken).toHaveBeenCalledWith(
        publicUser,
      );
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        refreshCookieName: 'cartech_refresh_token',
        user: publicUser,
      });
    });

    it('rejects an inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...databaseUser,
        isActive: false,
      });

      await expect(
        service.login({
          companyId: 'company-1',
          username: 'admin',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(databaseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          companyId: 'company-1',
          username: 'admin',
          password: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          companyId: 'company-1',
          username: 'unknown',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validSession = {
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'old_hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      user: databaseUser,
    };

    beforeEach(() => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'refresh',
      });
    });

    it('rotates the refresh token and returns current roles', async () => {
      mockPrisma.authSession.findUnique.mockResolvedValue(validSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.createRefreshToken.mockResolvedValue(
        'new_refresh_token',
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      mockPrisma.authSession.update.mockResolvedValue({});
      mockTokenService.createAccessToken.mockResolvedValue('new_access_token');

      const result = await service.refresh('old_token');

      expect(mockPrisma.authSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          user: {
            include: {
              roles: {
                select: {
                  role: true,
                },
              },
            },
          },
        },
      });
      expect(result.user).toEqual(publicUser);
      expect(mockTokenService.createAccessToken).toHaveBeenCalledWith(
        publicUser,
      );
    });

    it('rejects an inactive session user', async () => {
      mockPrisma.authSession.findUnique.mockResolvedValue({
        ...validSession,
        user: {
          ...databaseUser,
          isActive: false,
        },
      });

      await expect(service.refresh('old_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes the session when token reuse is detected', async () => {
      mockPrisma.authSession.findUnique.mockResolvedValue(validSession);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('reused_token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrisma.authSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('revokes a valid session', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        sessionId: 'session-1',
        type: 'refresh',
      });
      mockPrisma.authSession.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some_token');

      expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('does nothing when no token is provided', async () => {
      await expect(service.logout(undefined)).resolves.not.toThrow();
    });
  });

  describe('getMe', () => {
    it('returns the public user contract with roles', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(databaseUser);

      const result = await service.getMe('user-1');

      expect(result).toEqual(publicUser);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
