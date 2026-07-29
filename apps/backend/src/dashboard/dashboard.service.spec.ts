import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: { count: jest.fn() },
    vehicleEvent: { count: jest.fn() },
  };
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  it('returns metrics scoped by company and accessible locations', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [
        { locationId: 'location-1' },
        { locationId: 'location-2' },
      ],
    });
    prisma.car.count.mockResolvedValueOnce(12).mockResolvedValueOnce(4);
    prisma.vehicleEvent.count.mockResolvedValue(3);

    await expect(service.getDashboard('user-id')).resolves.toEqual({
      carsOnStock: 12,
      needPso: 4,
      issuedToday: 3,
    });

    const scope = {
      companyId: 'company-id',
      ownerLocationId: { in: ['location-1', 'location-2'] },
    };
    expect(prisma.car.count).toHaveBeenNthCalledWith(1, {
      where: {
        ...scope,
        lifecycleStatus: CarLifecycleStatus.ACTIVE,
      },
    });
    expect(prisma.car.count).toHaveBeenNthCalledWith(2, {
      where: {
        ...scope,
        lifecycleStatus: CarLifecycleStatus.ACTIVE,
        pso: { is: { status: PsoStatus.PENDING } },
      },
    });
    expect(prisma.vehicleEvent.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-id',
        locationId: { in: ['location-1', 'location-2'] },
        type: VehicleEventType.CAR_ISSUED,
        occurredAt: { gte: expect.any(Date) },
      },
    });
  });

  it('rejects a missing user before querying metrics', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getDashboard('user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.car.count).not.toHaveBeenCalled();
    expect(prisma.vehicleEvent.count).not.toHaveBeenCalled();
  });
});
