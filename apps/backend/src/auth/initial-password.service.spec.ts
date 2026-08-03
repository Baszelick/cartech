import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

jestRuntime.mock('bcrypt');

describe('AuthService initial password change', () => {
  const tx: any = {
    user: {
      findUnique: jestRuntime.fn(),
      update: jestRuntime.fn(),
    },
    authSession: {
      deleteMany: jestRuntime.fn(),
      create: jestRuntime.fn(),
      update: jestRuntime.fn(),
    },
  };
  const prisma: any = {
    $transaction: jestRuntime.fn(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    ),
  };
  const tokenService: any = {
    refreshExpiresInMs: 604_800_000,
    createRefreshToken: jestRuntime.fn(),
    createAccessToken: jestRuntime.fn(),
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
      async (callback: (client: typeof tx) => unknown) => callback(tx),
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
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: expect.objectContaining({ mustChangePassword: false }),
      }),
    );
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
