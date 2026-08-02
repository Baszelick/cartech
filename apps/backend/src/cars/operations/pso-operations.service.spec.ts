import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PsoOperationsService } from './pso-operations.service';

describe('PsoOperationsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pso: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    vehicleEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const userScope = {
    companyId: 'company-id',
    locationAccesses: [{ locationId: 'location-id' }],
  };
  const pendingCar = {
    id: 'car-id',
    companyId: 'company-id',
    ownerLocationId: 'location-id',
    lifecycleStatus: CarLifecycleStatus.ACTIVE,
    pso: { id: 'pso-id', status: PsoStatus.PENDING },
  };
  const completedPso = {
    id: 'pso-id',
    carId: 'car-id',
    status: PsoStatus.COMPLETED,
    deadlineOn: new Date('2026-08-05T00:00:00.000Z'),
    completedOn: new Date('2026-07-31T00:00:00.000Z'),
    completedById: 'user-id',
    createdAt: new Date('2026-07-29T09:30:00.000Z'),
    updatedAt: new Date('2026-07-31T10:15:00.000Z'),
  };
  let service: PsoOperationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        PsoOperationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PsoOperationsService);
  });

  it('returns the current PSO state for an accessible car', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue({ pso: completedPso });

    const result = await service.getCurrent('car-id', 'user-id');

    expect(result.status).toBe(PsoStatus.COMPLETED);
    expect(result.deadlineOn).toBe('2026-08-05');
    expect(prisma.car.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'car-id',
          companyId: 'company-id',
          ownerLocationId: { in: ['location-id'] },
        },
      }),
    );
  });

  it('completes PSO atomically with JWT user and creates an event', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T12:34:56.000Z'));
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(pendingCar);
    prisma.pso.updateMany.mockResolvedValue({ count: 1 });
    prisma.vehicleEvent.create.mockResolvedValue({ id: 'event-id' });
    prisma.pso.findUnique.mockResolvedValue(completedPso);

    const result = await service.complete('car-id', 'user-id');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pso.updateMany).toHaveBeenCalledWith({
      where: { id: 'pso-id', status: PsoStatus.PENDING },
      data: {
        status: PsoStatus.COMPLETED,
        completedOn: new Date('2026-07-31T12:34:56.000Z'),
        completedById: 'user-id',
      },
    });
    expect(prisma.vehicleEvent.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-id',
        carId: 'car-id',
        locationId: 'location-id',
        performedById: 'user-id',
        type: VehicleEventType.PSO_COMPLETED,
        title: 'Предпродажная подготовка завершена',
      },
    });
    expect(result.completedById).toBe('user-id');
    expect(prisma.car.update).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('returns NotFound without writes for a missing or unavailable car', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(null);

    await expect(service.complete('car-id', 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.car.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'car-id',
          companyId: 'company-id',
          ownerLocationId: { in: ['location-id'] },
        },
      }),
    );
    expect(prisma.pso.updateMany).not.toHaveBeenCalled();
    expect(prisma.vehicleEvent.create).not.toHaveBeenCalled();
  });

  it('rejects repeated completion', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue({
      ...pendingCar,
      pso: { id: 'pso-id', status: PsoStatus.COMPLETED },
    });

    await expect(service.complete('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.pso.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a concurrent repeated completion', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(pendingCar);
    prisma.pso.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.complete('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.vehicleEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.complete('car-id', 'user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.car.findFirst).not.toHaveBeenCalled();
  });
});
