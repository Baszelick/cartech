import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BatteryOperationsService } from './battery-operations.service';

describe('BatteryOperationsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    car: { findFirst: jest.fn() },
    batteryCheck: { create: jest.fn() },
  };
  let service: BatteryOperationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BatteryOperationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(BatteryOperationsService);
  });

  it('records a completed check for an accessible car', async () => {
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.car.findFirst.mockResolvedValue({ id: 'car-id' });
    prisma.batteryCheck.create.mockResolvedValue({
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
    prisma.car.findFirst.mockResolvedValue(null);

    await expect(
      service.createCheck('car-id', {}, 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.batteryCheck.create).not.toHaveBeenCalled();
  });
});
