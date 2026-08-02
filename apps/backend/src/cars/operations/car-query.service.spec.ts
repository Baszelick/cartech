import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CarQueryService } from './car-query.service';

describe('CarQueryService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };
  let service: CarQueryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.car.groupBy.mockResolvedValue([]);
    prisma.car.count.mockResolvedValue(0);
    const module = await Test.createTestingModule({
      providers: [
        CarQueryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CarQueryService);
  });

  it('lists cars within company and location scope', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findMany.mockResolvedValue([
      {
        id: 'car-id',
        vin: 'XW8ED41P21K123456',
        shortVin: '123456',
        brand: 'Jetour',
        model: 'X70 Plus',
        color: null,
        arrivedOn: new Date('2026-07-29T00:00:00.000Z'),
        lifecycleStatus: 'ACTIVE',
        isBlocked: false,
        ownerLocationId: 'location-id',
        currentSiteId: 'site-id',
      },
    ]);

    const result = await service.findAll('user-id');

    expect(result[0].arrivedOn).toBe('2026-07-29');
    expect(result[0].hasShortVinDuplicate).toBe(false);
    expect(prisma.car.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-id',
          ownerLocationId: { in: ['location-id'] },
        },
      }),
    );
    expect(prisma.car.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.car.groupBy).toHaveBeenCalledWith({
      by: ['shortVin'],
      where: {
        companyId: 'company-id',
        shortVin: { in: ['123456'] },
      },
      _count: { id: true },
      having: {
        id: { _count: { gt: 1 } },
      },
    });
  });

  it('rejects a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findAll('user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns a scoped car by UUID', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findFirst.mockResolvedValue({
      id: 'car-id',
      vin: 'XW8ED41P21K123456',
      shortVin: '123456',
      brand: 'Jetour',
      model: 'X70 Plus',
      color: null,
      arrivedOn: new Date('2026-07-29T00:00:00.000Z'),
      lifecycleStatus: 'ACTIVE',
      isBlocked: false,
      blockedReason: null,
      blockedAt: null,
      ownerLocationId: 'location-id',
      currentSiteId: 'site-id',
      arrivalSiteId: 'site-id',
      archivedReason: null,
      archivedAt: null,
      createdAt: new Date('2026-07-29T09:30:00.000Z'),
      updatedAt: new Date('2026-07-29T10:15:00.000Z'),
    });

    const result = await service.findById('car-id', 'user-id');

    expect(result.id).toBe('car-id');
    expect(result.createdAt).toBe('2026-07-29T09:30:00.000Z');
    expect(result.hasShortVinDuplicate).toBe(false);
    expect(prisma.car.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-id',
        shortVin: '123456',
        id: { not: 'car-id' },
      },
    });
  });

  it('marks duplicate shortVin from one company-scoped aggregation query', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findMany.mockResolvedValue([
      {
        id: 'car-id',
        vin: null,
        shortVin: 'ABC123',
        brand: 'Jetour',
        model: 'X70 Plus',
        color: null,
        arrivedOn: new Date('2026-07-29T00:00:00.000Z'),
        lifecycleStatus: 'ACTIVE',
        isBlocked: false,
        ownerLocationId: 'location-id',
        currentSiteId: 'site-id',
      },
    ]);
    prisma.car.groupBy.mockResolvedValue([
      { shortVin: 'ABC123', _count: { id: 2 } },
    ]);

    const result = await service.findAll('user-id');

    expect(result[0]).toEqual(
      expect.objectContaining({
        vin: null,
        hasShortVinDuplicate: true,
      }),
    );
    expect(prisma.car.groupBy).toHaveBeenCalledTimes(1);
  });

  it('hides a car outside the user scope', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findFirst.mockResolvedValue(null);
    await expect(service.findById('car-id', 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
