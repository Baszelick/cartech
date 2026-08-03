import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UserPersonnelService } from './user-personnel.service';

jestRuntime.mock('bcrypt');

describe('UserPersonnelService', () => {
  const tx: any = {
    location: { count: jestRuntime.fn() },
    user: {
      create: jestRuntime.fn(),
      findFirst: jestRuntime.fn(),
      update: jestRuntime.fn(),
    },
    userRoleAssignment: {
      createMany: jestRuntime.fn(),
      count: jestRuntime.fn(),
    },
    userLocationAccess: {
      createMany: jestRuntime.fn(),
      findMany: jestRuntime.fn(),
    },
    authSession: { deleteMany: jestRuntime.fn() },
  };
  const prisma: any = {
    $transaction: jestRuntime.fn(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    ),
  };
  const owner: AuthenticatedUser = {
    userId: 'owner-id',
    companyId: 'company-id',
    username: 'owner',
    roles: [UserRole.SYSTEM_OWNER],
    mustChangePassword: false,
  };
  const manager: AuthenticatedUser = {
    ...owner,
    userId: 'manager-id',
    username: 'manager',
    roles: [UserRole.OPERATIONS_MANAGER],
  };
  const createDto = {
    username: 'tech',
    firstName: 'Иван',
    lastName: 'Петров',
    temporaryPassword: 'Tech2026',
    roles: [UserRole.TECHNICIAN],
    locationIds: ['11111111-1111-4111-8111-111111111111'],
  };
  let service: UserPersonnelService;

  beforeEach(async () => {
    jestRuntime.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    (bcrypt.hash as jest.Mock).mockResolvedValue('password-hash');
    tx.location.count.mockResolvedValue(1);
    tx.user.create.mockResolvedValue({
      id: 'user-id',
      username: 'tech',
      firstName: 'Иван',
      lastName: 'Петров',
      isActive: true,
      mustChangePassword: true,
    });
    tx.userRoleAssignment.createMany.mockResolvedValue({ count: 1 });
    tx.userLocationAccess.createMany.mockResolvedValue({ count: 1 });
    tx.authSession.deleteMany.mockResolvedValue({ count: 1 });
    tx.userRoleAssignment.count.mockResolvedValue(1);
    tx.userLocationAccess.findMany.mockResolvedValue([
      { locationId: 'shared-location' },
    ]);

    const module = await Test.createTestingModule({
      providers: [
        UserPersonnelService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserPersonnelService);
  });

  it('creates user, roles and location access in one transaction', async () => {
    const result = await service.create(createDto, owner);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: owner.companyId,
          passwordHash: 'password-hash',
          isActive: true,
          mustChangePassword: true,
        }),
      }),
    );
    expect(tx.userRoleAssignment.createMany).toHaveBeenCalled();
    expect(tx.userLocationAccess.createMany).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('allows owner to create manager and multiple roles', async () => {
    await expect(
      service.create(
        {
          ...createDto,
          roles: [UserRole.OPERATIONS_MANAGER, UserRole.VIEWER],
        },
        owner,
      ),
    ).resolves.toBeDefined();
  });

  it('allows manager to create a single-role technician', async () => {
    await expect(service.create(createDto, manager)).resolves.toBeDefined();
  });

  it.each([
    [UserRole.SYSTEM_OWNER],
    [UserRole.OPERATIONS_MANAGER],
    [UserRole.VIEWER],
    [UserRole.TECHNICIAN, UserRole.VIEWER],
  ])('rejects manager creation roles %j', async (...roles: UserRole[]) => {
    await expect(
      service.create({ ...createDto, roles }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unavailable or inactive locations without disclosure', async () => {
    tx.location.count.mockResolvedValue(0);
    await expect(service.create(createDto, owner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('maps username uniqueness to conflict', async () => {
    tx.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create(createDto, owner)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('resets technician password and deletes sessions transactionally', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: true,
      roles: [{ role: UserRole.TECHNICIAN }],
    });
    tx.user.update.mockResolvedValue({});

    const result = await service.resetPassword(
      'tech-id',
      { temporaryPassword: 'Reset2026' },
      manager,
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'tech-id' },
      data: {
        passwordHash: 'password-hash',
        mustChangePassword: true,
      },
    });
    expect(tx.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'tech-id' },
    });
    expect(result.mustChangePassword).toBe(true);
  });

  it('prevents manager from resetting a non-technician', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'owner-id',
      isActive: true,
      roles: [{ role: UserRole.SYSTEM_OWNER }],
    });
    await expect(
      service.resetPassword(
        'owner-id',
        { temporaryPassword: 'Reset2026' },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents administrative self reset', async () => {
    await expect(
      service.resetPassword(
        owner.userId,
        { temporaryPassword: 'Reset2026' },
        owner,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides a foreign or missing user', async () => {
    tx.user.findFirst.mockResolvedValue(null);
    await expect(
      service.resetPassword(
        'missing-id',
        { temporaryPassword: 'Reset2026' },
        owner,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reset for an inactive user', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: false,
      roles: [{ role: UserRole.TECHNICIAN }],
    });
    await expect(
      service.resetPassword(
        'tech-id',
        { temporaryPassword: 'Reset2026' },
        owner,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('owner edits and normalizes personnel identity', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: true,
      roles: [{ role: UserRole.TECHNICIAN }],
      locationAccesses: [{ locationId: 'shared-location' }],
    });
    tx.user.update.mockResolvedValue({
      id: 'tech-id',
      username: 'updated.tech',
      firstName: 'Иван',
      lastName: 'Петров',
      isActive: true,
      mustChangePassword: false,
    });

    const result = await service.update(
      'tech-id',
      { username: 'updated.tech' },
      owner,
    );
    expect(result.username).toBe('updated.tech');
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { username: 'updated.tech' },
      }),
    );
  });

  it('manager edits a technician only with a shared location', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: true,
      roles: [{ role: UserRole.TECHNICIAN }],
      locationAccesses: [{ locationId: 'shared-location' }],
    });
    tx.user.update.mockResolvedValue({
      id: 'tech-id',
      username: 'tech',
      firstName: 'Иван',
      lastName: 'Новый',
      isActive: true,
      mustChangePassword: false,
    });
    await expect(
      service.update('tech-id', { lastName: 'Новый' }, manager),
    ).resolves.toBeDefined();

    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: true,
      roles: [{ role: UserRole.TECHNICIAN }],
      locationAccesses: [{ locationId: 'foreign-location' }],
    });
    await expect(
      service.update('tech-id', { lastName: 'Новый' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deactivates user and deletes sessions but protects self and last owner', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: true,
      roles: [{ role: UserRole.TECHNICIAN }],
      locationAccesses: [{ locationId: 'shared-location' }],
    });
    tx.user.update.mockResolvedValue({
      id: 'tech-id',
      username: 'tech',
      firstName: 'Иван',
      lastName: 'Петров',
      isActive: false,
      mustChangePassword: false,
    });
    await service.deactivate('tech-id', owner);
    expect(tx.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'tech-id' },
    });
    await expect(
      service.deactivate(owner.userId, owner),
    ).rejects.toBeInstanceOf(ForbiddenException);

    tx.user.findFirst.mockResolvedValue({
      id: 'other-owner',
      isActive: true,
      roles: [{ role: UserRole.SYSTEM_OWNER }],
      locationAccesses: [],
    });
    tx.userRoleAssignment.count.mockResolvedValue(0);
    await expect(
      service.deactivate('other-owner', owner),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('activates with a new hash, forced change and session deletion', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'tech-id',
      isActive: false,
      roles: [{ role: UserRole.TECHNICIAN }],
      locationAccesses: [{ locationId: 'shared-location' }],
    });
    tx.user.update.mockResolvedValue({
      id: 'tech-id',
      username: 'tech',
      firstName: 'Иван',
      lastName: 'Петров',
      isActive: true,
      mustChangePassword: true,
    });
    const result = await service.activate(
      'tech-id',
      { temporaryPassword: 'Active2026' },
      owner,
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isActive: true,
          passwordHash: 'password-hash',
          mustChangePassword: true,
        },
      }),
    );
    expect(tx.authSession.deleteMany).toHaveBeenCalled();
    expect(result.mustChangePassword).toBe(true);
  });
});
