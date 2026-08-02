import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BatteryScheduleService } from '../../battery/battery-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BatteryOperationsService } from './battery-operations.service';

describe('BatteryOperationsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx = {
    car: { findFirst: jest.fn() },
    batteryCheck: { count: jest.fn(), create: jest.fn() },
  };
  let service: BatteryOperationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BatteryOperationsService,
        BatteryScheduleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BatteryOperationsService);
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
  });

  it('records a completed check for an accessible car', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    tx.car.findFirst.mockResolvedValue({
      id: 'car-id',
      arrivedOn: new Date('2026-06-01T00:00:00.000Z'),
    });
    tx.batteryCheck.count.mockResolvedValue(0);
    tx.batteryCheck.create.mockResolvedValue({
      id: 'check-id',
      carId: 'car-id',
      checkedById: 'user-id',
      checkedOn: new Date('2026-07-29T00:00:00.000Z'),
      voltage: 12.6,
      comment: 'Normal',
      createdAt: new Date('2026-07-29T10:15:00.000Z'),
    });

    const result = await service.createCheck(
      'car-id',
      { voltage: 12.6, comment: 'Normal' },
      'user-id',
    );

    expect(result.voltage).toBe(12.6);
    expect(result.checkedOn).toBe('2026-07-29');
  });

  it('does not record a check for an unavailable car', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    tx.car.findFirst.mockResolvedValue(null);

    await expect(
      service.createCheck('car-id', {}, 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.batteryCheck.create).not.toHaveBeenCalled();
  });

  it('closes only the oldest unclosed period inside the transaction', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-05T12:00:00.000Z'));
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    tx.car.findFirst.mockResolvedValue({
      id: 'car-id',
      arrivedOn: new Date('2026-08-01T00:00:00.000Z'),
    });
    tx.batteryCheck.count.mockResolvedValue(1);
    tx.batteryCheck.create.mockResolvedValue({
      id: 'check-id',
      carId: 'car-id',
      checkedById: 'user-id',
      checkedOn: new Date('2026-10-05T12:00:00.000Z'),
      voltage: null,
      comment: null,
      createdAt: new Date('2026-10-05T12:00:00.000Z'),
    });

    await service.createCheck('car-id', {}, 'user-id');

    expect(tx.batteryCheck.count).toHaveBeenCalledWith({
      where: { carId: 'car-id' },
    });
    expect(tx.batteryCheck.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          carId: 'car-id',
          checkedById: 'user-id',
          checkedOn: new Date('2026-10-05T12:00:00.000Z'),
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('rejects a check before the three-day window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    tx.car.findFirst.mockResolvedValue({
      id: 'car-id',
      arrivedOn: new Date('2026-08-01T00:00:00.000Z'),
    });
    tx.batteryCheck.count.mockResolvedValue(0);

    await expect(
      service.createCheck('car-id', {}, 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.batteryCheck.create).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
