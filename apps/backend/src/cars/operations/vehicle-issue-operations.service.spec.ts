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
import { VehicleIssueOperationsService } from './vehicle-issue-operations.service';

describe('VehicleIssueOperationsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    vehicleIssue: { create: jest.fn() },
    vehicleEvent: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const userScope = {
    companyId: 'company-id',
    locationAccesses: [{ locationId: 'location-id' }],
  };
  const eligibleCar = {
    id: 'car-id',
    companyId: 'company-id',
    ownerLocationId: 'location-id',
    lifecycleStatus: CarLifecycleStatus.ACTIVE,
    isBlocked: false,
    pso: { status: PsoStatus.COMPLETED },
  };
  const createdIssue = {
    id: 'issue-id',
    carId: 'car-id',
    appointmentId: null,
    issuedOn: new Date('2026-08-01T00:00:00.000Z'),
    issuedById: 'user-id',
    createdAt: new Date('2026-08-01T10:15:00.000Z'),
    updatedAt: new Date('2026-08-01T10:15:00.000Z'),
  };
  let service: VehicleIssueOperationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        VehicleIssueOperationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(VehicleIssueOperationsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('issues an eligible car atomically with JWT user and server time', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T12:34:56.000Z'));
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(eligibleCar);
    prisma.car.updateMany.mockResolvedValue({ count: 1 });
    prisma.vehicleIssue.create.mockResolvedValue(createdIssue);
    prisma.vehicleEvent.create.mockResolvedValue({ id: 'event-id' });

    const result = await service.issue('car-id', 'user-id');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.car.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'car-id',
          companyId: 'company-id',
          ownerLocationId: { in: ['location-id'] },
        },
      }),
    );
    expect(prisma.car.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'car-id',
        lifecycleStatus: CarLifecycleStatus.ACTIVE,
        isBlocked: false,
      },
      data: { lifecycleStatus: CarLifecycleStatus.ISSUED },
    });
    expect(prisma.vehicleIssue.create).toHaveBeenCalledWith({
      data: {
        carId: 'car-id',
        issuedById: 'user-id',
        issuedOn: new Date('2026-08-01T12:34:56.000Z'),
      },
      select: expect.any(Object),
    });
    expect(prisma.vehicleEvent.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-id',
        carId: 'car-id',
        locationId: 'location-id',
        performedById: 'user-id',
        type: VehicleEventType.CAR_ISSUED,
        title: 'Автомобиль выдан',
      },
    });
    expect(result).toEqual({
      ...createdIssue,
      issuedOn: '2026-08-01',
      lifecycleStatus: CarLifecycleStatus.ISSUED,
      createdAt: '2026-08-01T10:15:00.000Z',
      updatedAt: '2026-08-01T10:15:00.000Z',
    });
  });

  it('returns NotFound for a missing or inaccessible car without writes', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(null);

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
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
    expect(prisma.car.updateMany).not.toHaveBeenCalled();
    expect(prisma.vehicleIssue.create).not.toHaveBeenCalled();
  });

  it('rejects repeated issue for a non-ACTIVE car', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue({
      ...eligibleCar,
      lifecycleStatus: CarLifecycleStatus.ISSUED,
    });

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.car.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a blocked car', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue({
      ...eligibleCar,
      isBlocked: true,
    });

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.vehicleIssue.create).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['pending', { status: PsoStatus.PENDING }],
  ])('rejects issue when completed PSO is %s', async (_case, pso) => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue({ ...eligibleCar, pso });

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.car.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a concurrent repeated issue', async () => {
    prisma.user.findUnique.mockResolvedValue(userScope);
    prisma.car.findFirst.mockResolvedValue(eligibleCar);
    prisma.car.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.vehicleIssue.create).not.toHaveBeenCalled();
    expect(prisma.vehicleEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.issue('car-id', 'user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.car.findFirst).not.toHaveBeenCalled();
  });
});
