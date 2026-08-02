import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BatteryScheduleService } from '../../battery/battery-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CarTaskStatus, CarTaskType } from '../dto/car-task-response.dto';
import { CarTasksService } from './car-tasks.service';

describe('CarTasksService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: { findMany: jest.fn() },
  };
  let service: CarTasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
    const module = await Test.createTestingModule({
      providers: [
        CarTasksService,
        BatteryScheduleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CarTasksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns pending PSO and the current battery task in stable order', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findMany.mockResolvedValue([
      {
        id: 'car-1',
        vin: 'VIN1',
        arrivedOn: new Date('2026-08-01T00:00:00.000Z'),
        pso: {
          status: 'PENDING',
          deadlineOn: new Date('2026-08-04T00:00:00.000Z'),
        },
        _count: { batteryChecks: 0 },
      },
      {
        id: 'car-2',
        vin: 'VIN2',
        arrivedOn: new Date('2026-07-31T00:00:00.000Z'),
        pso: { status: 'COMPLETED', deadlineOn: new Date('2026-08-03') },
        _count: { batteryChecks: 0 },
      },
    ]);

    await expect(service.findAll('user-id')).resolves.toEqual([
      {
        carId: 'car-1',
        vin: 'VIN1',
        type: CarTaskType.PSO,
        status: CarTaskStatus.PENDING,
        dueOn: '2026-08-04',
      },
      {
        carId: 'car-2',
        vin: 'VIN2',
        type: CarTaskType.BATTERY,
        status: CarTaskStatus.URGENT,
        dueOn: '2026-08-30',
        periodNumber: 1,
      },
      {
        carId: 'car-1',
        vin: 'VIN1',
        type: CarTaskType.BATTERY,
        status: CarTaskStatus.UPCOMING,
        dueOn: '2026-08-31',
        periodNumber: 1,
      },
    ]);

    expect(prisma.car.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-id',
          ownerLocationId: { in: ['location-id'] },
          lifecycleStatus: 'ACTIVE',
        }),
      }),
    );
  });

  it('omits a battery task outside the three-day window', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findMany.mockResolvedValue([
      {
        id: 'car-1',
        vin: 'VIN1',
        arrivedOn: new Date('2026-08-15T00:00:00.000Z'),
        pso: { status: 'COMPLETED', deadlineOn: new Date('2026-08-18') },
        _count: { batteryChecks: 0 },
      },
    ]);

    await expect(service.findAll('user-id')).resolves.toEqual([]);
  });

  it('rejects an unknown authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findAll('user-id')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.car.findMany).not.toHaveBeenCalled();
  });
});
