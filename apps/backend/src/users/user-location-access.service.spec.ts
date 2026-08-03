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
  const prisma: any = {
    user: { findFirst: jest.fn() },
    location: { findMany: jest.fn() },
    userLocationAccess: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const manager: AuthenticatedUser = {
    userId: 'manager-id',
    companyId: 'company-id',
    username: 'manager',
    roles: [UserRole.OPERATIONS_MANAGER],
    mustChangePassword: false,
  };
  const owner: AuthenticatedUser = {
    ...manager,
    userId: 'owner-id',
    username: 'owner',
    roles: [UserRole.SYSTEM_OWNER],
  };
  const technician = {
    id: 'tech-id',
    isActive: true,
    roles: [{ role: UserRole.TECHNICIAN }],
    locationAccesses: [
      { locationId: 'manager-location' },
      { locationId: 'foreign-location' },
    ],
  };
  let service: UserLocationAccessService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.user.findFirst.mockResolvedValue(technician);
    prisma.userLocationAccess.findMany.mockResolvedValue([
      { locationId: 'manager-location' },
      { locationId: 'manager-location-2' },
    ]);
    prisma.location.findMany
      .mockResolvedValueOnce([{ id: 'manager-location-2' }])
      .mockResolvedValueOnce([
        {
          id: 'foreign-location',
          code: 'FOREIGN',
          name: 'Внешняя',
          isActive: true,
        },
        {
          id: 'manager-location-2',
          code: 'M2',
          name: 'Доступная',
          isActive: true,
        },
      ]);
    const module = await Test.createTestingModule({
      providers: [
        UserLocationAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserLocationAccessService);
  });

  it('manager replaces only access inside own scope and preserves foreign access', async () => {
    const result = await service.replaceForUser(
      'tech-id',
      { locationIds: ['manager-location-2'] },
      manager,
    );

    expect(prisma.userLocationAccess.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'tech-id',
        locationId: {
          in: ['manager-location', 'manager-location-2'],
        },
      },
    });
    expect(prisma.userLocationAccess.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'tech-id',
          locationId: 'manager-location-2',
        },
      ],
    });
    expect(result.locations.map(({ id }) => id)).toContain(
      'foreign-location',
    );
  });

  it('manager cannot assign a location outside own scope', async () => {
    prisma.location.findMany.mockReset().mockResolvedValue([]);
    await expect(
      service.replaceForUser(
        'tech-id',
        { locationIds: ['foreign-location'] },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userLocationAccess.deleteMany).not.toHaveBeenCalled();
  });

  it('manager is denied without a shared location', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...technician,
      locationAccesses: [{ locationId: 'foreign-location' }],
    });
    await expect(
      service.replaceForUser('tech-id', { locationIds: [] }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('manager cannot manage a non-technician', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...technician,
      roles: [{ role: UserRole.OPERATIONS_MANAGER }],
    });
    await expect(
      service.replaceForUser('tech-id', { locationIds: [] }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('owner replaces the full location set', async () => {
    prisma.location.findMany.mockReset()
      .mockResolvedValueOnce([{ id: 'manager-location' }])
      .mockResolvedValueOnce([]);
    await service.replaceForUser(
      'tech-id',
      { locationIds: ['manager-location'] },
      owner,
    );
    expect(prisma.userLocationAccess.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'tech-id' },
    });
  });

  it('prevents an active user from ending with no locations', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...technician,
      locationAccesses: [{ locationId: 'manager-location' }],
    });
    await expect(
      service.replaceForUser('tech-id', { locationIds: [] }, manager),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides a foreign user and rejects duplicate UUIDs', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.replaceForUser('foreign-id', { locationIds: [] }, owner),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.replaceForUser(
        'tech-id',
        { locationIds: ['same', 'same'] },
        owner,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
