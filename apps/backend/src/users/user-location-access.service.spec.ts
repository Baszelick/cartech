import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UserLocationAccessService } from './user-location-access.service';

describe('UserLocationAccessService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    location: { findMany: jest.fn() },
    userLocationAccess: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const manager = {
    userId: 'manager-id',
    companyId: 'company-id',
    username: 'manager',
    roles: [UserRole.OPERATIONS_MANAGER],
  } as AuthenticatedUser;
  const owner = {
    userId: 'owner-id',
    companyId: 'company-id',
    username: 'owner',
    roles: [UserRole.SYSTEM_OWNER],
  } as AuthenticatedUser;
  const assignedLocation = {
    id: 'location-id',
    code: 'MSK',
    name: 'Москва',
    isActive: true,
  };
  let service: UserLocationAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        UserLocationAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserLocationAccessService);
  });

  it('returns current access for a user in the JWT company', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'target-id' });
    prisma.location.findMany.mockResolvedValue([assignedLocation]);

    const result = await service.getForUser('target-id', 'company-id');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'target-id', companyId: 'company-id' },
      select: { id: true },
    });
    expect(prisma.location.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-id',
        userAccesses: { some: { userId: 'target-id' } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
    expect(result).toEqual({
      userId: 'target-id',
      locations: [assignedLocation],
    });
  });

  it('hides a user from another company through NotFound', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.getForUser('foreign-user-id', 'company-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.location.findMany).not.toHaveBeenCalled();
  });

  it('fully replaces access in one transaction', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'target-id' });
    prisma.location.findMany
      .mockResolvedValueOnce([{ id: 'location-id' }])
      .mockResolvedValueOnce([assignedLocation]);
    prisma.userLocationAccess.deleteMany.mockResolvedValue({ count: 1 });
    prisma.userLocationAccess.createMany.mockResolvedValue({ count: 1 });

    const result = await service.replaceForUser(
      'target-id',
      { locationIds: ['location-id'] },
      manager,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.location.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: 'company-id',
        id: { in: ['location-id'] },
      },
      select: { id: true },
    });
    expect(prisma.userLocationAccess.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-id' },
    });
    expect(prisma.userLocationAccess.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'target-id', locationId: 'location-id' }],
    });
    expect(result.locations).toEqual([assignedLocation]);
  });

  it('accepts an empty array and removes all access', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'target-id' });
    prisma.userLocationAccess.deleteMany.mockResolvedValue({ count: 2 });
    prisma.location.findMany.mockResolvedValue([]);

    const result = await service.replaceForUser(
      'target-id',
      { locationIds: [] },
      manager,
    );

    expect(prisma.userLocationAccess.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-id' },
    });
    expect(prisma.userLocationAccess.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ userId: 'target-id', locations: [] });
  });

  it('rejects duplicate locationIds before the transaction', async () => {
    await expect(
      service.replaceForUser(
        'target-id',
        { locationIds: ['location-id', 'location-id'] },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a location outside the JWT company without replacing access', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'target-id' });
    prisma.location.findMany.mockResolvedValue([]);

    await expect(
      service.replaceForUser(
        'target-id',
        { locationIds: ['foreign-location-id'] },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userLocationAccess.deleteMany).not.toHaveBeenCalled();
  });

  it('allows SYSTEM_OWNER to replace own access', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-id' });
    prisma.userLocationAccess.deleteMany.mockResolvedValue({ count: 1 });
    prisma.location.findMany.mockResolvedValue([]);

    await expect(
      service.replaceForUser('owner-id', { locationIds: [] }, owner),
    ).resolves.toEqual({ userId: 'owner-id', locations: [] });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('forbids OPERATIONS_MANAGER from replacing own access', async () => {
    await expect(
      service.replaceForUser('manager-id', { locationIds: [] }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
