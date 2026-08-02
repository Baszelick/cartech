import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CarQueryService } from './car-query.service';
import { CarIdentityOperationsService } from './car-identity-operations.service';

describe('CarIdentityOperationsService', () => {
  const tx = {
    car: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const carQueries = {
    findById: jest.fn(),
  };
  let service: CarIdentityOperationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      companyId: 'company-id',
      locationAccesses: [{ locationId: 'location-id' }],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => unknown) => callback(tx),
    );
    tx.car.findFirst.mockResolvedValueOnce({ id: 'car-id' });
    tx.car.update.mockResolvedValue({ id: 'car-id' });
    carQueries.findById.mockResolvedValue({
      id: 'car-id',
      shortVin: 'ABC123',
      vin: null,
      hasShortVinDuplicate: false,
    });

    const module = await Test.createTestingModule({
      providers: [
        CarIdentityOperationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CarQueryService, useValue: carQueries },
      ],
    }).compile();
    service = module.get(CarIdentityOperationsService);
  });

  it.each([
    [{ shortVin: 'ABC123' }, { shortVin: 'ABC123' }],
    [{ vin: 'XW8ED41P21K123456' }, { vin: 'XW8ED41P21K123456' }],
    [{ vin: null }, { vin: null }],
  ])('updates only provided identity fields', async (dto, expectedData) => {
    if ('vin' in dto && dto.vin) {
      tx.car.findFirst
        .mockReset()
        .mockResolvedValueOnce({ id: 'car-id' })
        .mockResolvedValueOnce(null);
    }

    await service.update('car-id', dto, 'user-id');

    expect(tx.car.update).toHaveBeenCalledWith({
      where: { id: 'car-id' },
      data: expectedData,
    });
    expect(carQueries.findById).toHaveBeenCalledWith('car-id', 'user-id');
  });

  it('allows duplicate shortVin and returns the query response warning', async () => {
    carQueries.findById.mockResolvedValue({
      id: 'car-id',
      shortVin: 'ABC123',
      vin: null,
      hasShortVinDuplicate: true,
    });

    const result = await service.update(
      'car-id',
      { shortVin: 'ABC123' },
      'user-id',
    );

    expect(result.hasShortVinDuplicate).toBe(true);
  });

  it('rejects a full VIN conflict inside the company', async () => {
    tx.car.findFirst
      .mockReset()
      .mockResolvedValueOnce({ id: 'car-id' })
      .mockResolvedValueOnce({ id: 'other-car-id' });

    await expect(
      service.update('car-id', { vin: 'XW8ED41P21K123456' }, 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.car.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        companyId: 'company-id',
        vin: 'XW8ED41P21K123456',
        id: { not: 'car-id' },
      },
      select: { id: true },
    });
    expect(tx.car.update).not.toHaveBeenCalled();
  });

  it('hides an absent or inaccessible car', async () => {
    tx.car.findFirst.mockReset().mockResolvedValue(null);

    await expect(
      service.update('car-id', { shortVin: 'ABC123' }, 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.car.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'car-id',
        companyId: 'company-id',
        ownerLocationId: { in: ['location-id'] },
      },
      select: { id: true },
    });
  });

  it('rejects an empty update', async () => {
    await expect(
      service.update('car-id', {}, 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps a database VIN race conflict to HTTP conflict', async () => {
    tx.car.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.update('car-id', { shortVin: 'ABC123' }, 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
