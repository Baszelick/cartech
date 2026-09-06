import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

jestRuntime.mock('bcrypt');

type AsyncMock = (...args: unknown[]) => Promise<unknown>;

describe('AuthService initial password change', () => {
  const tx = {
    user: {
      findUnique: jestRuntime.fn<AsyncMock>(),
      update: jestRuntime.fn<AsyncMock>(),
    },
    authSession: {
      deleteMany: jestRuntime.fn<AsyncMock>(),
      create: jestRuntime.fn<AsyncMock>(),
      update: jestRuntime.fn<AsyncMock>(),
    },
  };
  type TransactionCallback = (client: typeof tx) => Promise<unknown>;
  const prisma = {
    $transaction: jestRuntime.fn(
      (callback: TransactionCallback): Promise<unknown> => callback(tx),
    ),
  };
  const tokenService = {
    refreshExpiresInMs: 604_800_000,
    createRefreshToken: jestRuntime.fn<AsyncMock>(),
    createAccessToken: jestRuntime.fn<AsyncMock>(),
  };
  const user = {
    id: 'user-id',
    companyId: 'company-id',
    username: 'tech',
    firstName: 'Иван',
    lastName: 'Петров',
    passwordHash: 'temporary-hash',
    isActive: true,
    mustChangePassword: true,
    roles: [{ role: 'TECHNICIAN' }],
  };
  let service: AuthService;

  beforeEach(async () => {
    jestRuntime.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: TransactionCallback): Promise<unknown> => callback(tx),
    );
    tx.user.findUnique.mockResolvedValue(user);
    tx.user.update.mockResolvedValue({
      ...user,
      passwordHash: 'new-password-hash',
      mustChangePassword: false,
    });
    tx.authSession.deleteMany.mockResolvedValue({ count: 2 });
    tx.authSession.create.mockResolvedValue({ id: 'new-session-id' });
    tx.authSession.update.mockResolvedValue({});
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    (bcrypt.hash as jest.Mock)
      .mockResolvedValueOnce('new-password-hash')
      .mockResolvedValueOnce('refresh-hash');
    tokenService.createRefreshToken.mockResolvedValue('new-refresh-token');
    tokenService.createAccessToken.mockResolvedValue('new-access-token');

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jestRuntime
              .fn()
              .mockReturnValue('cartech_refresh_token'),
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('changes password, clears sessions and creates a rotated session', async () => {
    const result = await service.changeInitialPassword(
      'user-id',
      'Changed2026',
    );

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          passwordHash: 'new-password-hash',
          mustChangePassword: false,
        },
      }),
    );
    expect(tx.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
    });
    expect(tx.authSession.create).toHaveBeenCalled();
    expect(tx.authSession.update).toHaveBeenCalledWith({
      where: { id: 'new-session-id' },
      data: { refreshTokenHash: 'refresh-hash' },
    });
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.user.mustChangePassword).toBe(false);
  });

  it('rejects a password equal to the temporary password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    await expect(
      service.changeInitialPassword('user-id', 'Tech2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('rejects a user without the change requirement', async () => {
    tx.user.findUnique.mockResolvedValue({
      ...user,
      mustChangePassword: false,
    });
    await expect(
      service.changeInitialPassword('user-id', 'Changed2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an inactive user', async () => {
    tx.user.findUnique.mockResolvedValue({ ...user, isActive: false });
    await expect(
      service.changeInitialPassword('user-id', 'Changed2026'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
