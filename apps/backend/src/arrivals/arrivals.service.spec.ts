import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { jest as jestRuntime } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ArrivalsService } from './arrivals.service';

interface MockTx {
  user: { findFirst: jest.Mock };
  site: { findFirst: jest.Mock };
  car: { findMany: jest.Mock; create: jest.Mock };
  vehicleEvent: { create: jest.Mock };
}

function createMockTx(): MockTx {
  return {
    user: { findFirst: jestRuntime.fn() },
    site: { findFirst: jestRuntime.fn() },
    car: {
      findMany: jestRuntime.fn(),
      create: jestRuntime.fn(),
    },
    vehicleEvent: { create: jestRuntime.fn() },
  };
}

describe('ArrivalsService', () => {
  let service: ArrivalsService;
  let mockPrisma: { $transaction: jest.Mock };

  const auth = {
    userId: 'user-1',
    companyId: 'company-1',
  };

  const dto = {
    arrivalSiteId: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    arrivedOn: '2026-07-29',
    cars: [
      {
        vin: 'XW8ED41P21K123456',
        shortVin: '123456',
        brand: 'Toyota',
        model: 'Camry',
        color: undefined,
      },
    ],
  };

  const activeUser = {
    locationAccesses: [{ locationId: 'location-1' }],
  };

  const arrivalSite = {
    id: dto.arrivalSiteId,
    locationId: 'location-1',
  };

  const createdCar = {
    id: 'car-1',
    vin: dto.cars[0].vin,
    shortVin: dto.cars[0].shortVin,
    brand: dto.cars[0].brand,
    model: dto.cars[0].model,
    color: null,
    arrivedOn: new Date('2026-07-29T00:00:00.000Z'),
    lifecycleStatus: 'ACTIVE',
    ownerLocationId: 'location-1',
    currentSiteId: dto.arrivalSiteId,
    arrivalSiteId: dto.arrivalSiteId,
    createdAt: new Date('2026-07-29T10:00:00.000Z'),
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jestRuntime.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArrivalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ArrivalsService>(ArrivalsService);
  });

  function runInTransaction(tx: MockTx): void {
    mockPrisma.$transaction.mockImplementation(
      async (callback: (transaction: MockTx) => unknown) => callback(tx),
    );
  }

  function prepareSuccessfulTx(tx: MockTx): void {
    tx.user.findFirst.mockResolvedValue(activeUser);
    tx.site.findFirst.mockResolvedValue(arrivalSite);
    tx.car.findMany.mockResolvedValue([]);
    tx.car.create.mockResolvedValue(createdCar);
    tx.vehicleEvent.create.mockResolvedValue({ id: 'event-1' });
    runInTransaction(tx);
  }

  it('creates scoped ACTIVE cars and CAR_ARRIVED events atomically', async () => {
    const tx = createMockTx();
    prepareSuccessfulTx(tx);

    const result = await service.create(dto, auth);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: auth.userId,
        companyId: auth.companyId,
        isActive: true,
      },
      select: {
        locationAccesses: {
          select: {
            locationId: true,
          },
        },
      },
    });
    expect(tx.site.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.arrivalSiteId,
        isActive: true,
        location: {
          companyId: auth.companyId,
          isActive: true,
        },
      },
      select: {
        id: true,
        locationId: true,
      },
    });
    expect(tx.car.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          companyId: auth.companyId,
          ownerLocationId: arrivalSite.locationId,
          currentSiteId: arrivalSite.id,
          arrivalSiteId: arrivalSite.id,
          createdById: auth.userId,
          vin: dto.cars[0].vin,
          shortVin: dto.cars[0].shortVin,
          brand: dto.cars[0].brand,
          model: dto.cars[0].model,
          color: null,
          arrivedOn: expect.any(Date),
          lifecycleStatus: 'ACTIVE',
        },
      }),
    );
    expect(tx.vehicleEvent.create).toHaveBeenCalledWith({
      data: {
        companyId: auth.companyId,
        carId: createdCar.id,
        locationId: arrivalSite.locationId,
        performedById: auth.userId,
        type: 'CAR_ARRIVED',
        title: 'Автомобиль принят',
      },
    });
    expect(result).toEqual({
      count: 1,
      cars: [
        {
          ...createdCar,
          arrivedOn: '2026-07-29',
          lifecycleStatus: 'ACTIVE',
          createdAt: '2026-07-29T10:00:00.000Z',
        },
      ],
    });
  });

  it('uses one arrival date for every car in a batch', async () => {
    const tx = createMockTx();
    prepareSuccessfulTx(tx);
    tx.car.create.mockResolvedValueOnce(createdCar).mockResolvedValueOnce({
      ...createdCar,
      id: 'car-2',
      vin: 'XW8ED41P21K654321',
    });

    await service.create(
      {
        ...dto,
        cars: [
          dto.cars[0],
          {
            ...dto.cars[0],
            vin: 'XW8ED41P21K654321',
            shortVin: '654321',
          },
        ],
      },
      auth,
    );

    const firstDate = tx.car.create.mock.calls[0][0].data.arrivedOn;
    const secondDate = tx.car.create.mock.calls[1][0].data.arrivedOn;

    expect(firstDate).toBe(secondDate);
    expect(tx.vehicleEvent.create).toHaveBeenCalledTimes(2);
  });

  it('rejects duplicate VINs before starting a transaction', async () => {
    await expect(
      service.create(
        {
          ...dto,
          cars: [dto.cars[0], { ...dto.cars[0] }],
        },
        auth,
      ),
    ).rejects.toThrow(ConflictException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive or missing user', async () => {
    const tx = createMockTx();
    tx.user.findFirst.mockResolvedValue(null);
    tx.site.findFirst.mockResolvedValue(arrivalSite);
    tx.car.findMany.mockResolvedValue([]);
    runInTransaction(tx);

    await expect(service.create(dto, auth)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tx.car.create).not.toHaveBeenCalled();
  });

  it('rejects a site outside the user company', async () => {
    const tx = createMockTx();
    tx.user.findFirst.mockResolvedValue(activeUser);
    tx.site.findFirst.mockResolvedValue(null);
    tx.car.findMany.mockResolvedValue([]);
    runInTransaction(tx);

    await expect(service.create(dto, auth)).rejects.toThrow(NotFoundException);
    expect(tx.car.create).not.toHaveBeenCalled();
  });

  it('rejects a site outside the user location scope', async () => {
    const tx = createMockTx();
    tx.user.findFirst.mockResolvedValue({
      locationAccesses: [{ locationId: 'location-other' }],
    });
    tx.site.findFirst.mockResolvedValue(arrivalSite);
    tx.car.findMany.mockResolvedValue([]);
    runInTransaction(tx);

    await expect(service.create(dto, auth)).rejects.toThrow(ForbiddenException);
    expect(tx.car.create).not.toHaveBeenCalled();
  });

  it('checks existing VINs inside the authenticated company', async () => {
    const tx = createMockTx();
    tx.user.findFirst.mockResolvedValue(activeUser);
    tx.site.findFirst.mockResolvedValue(arrivalSite);
    tx.car.findMany.mockResolvedValue([{ vin: dto.cars[0].vin }]);
    runInTransaction(tx);

    await expect(service.create(dto, auth)).rejects.toThrow(ConflictException);
    expect(tx.car.findMany).toHaveBeenCalledWith({
      where: {
        companyId: auth.companyId,
        vin: {
          in: [dto.cars[0].vin],
        },
      },
      select: {
        vin: true,
      },
    });
    expect(tx.car.create).not.toHaveBeenCalled();
  });

  it('maps a database unique constraint to ConflictException', async () => {
    const tx = createMockTx();
    prepareSuccessfulTx(tx);
    tx.car.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.create(dto, auth)).rejects.toThrow(ConflictException);
  });

  it('propagates non-unique transaction errors', async () => {
    const tx = createMockTx();
    const databaseError = new Error('DATABASE_UNAVAILABLE');
    prepareSuccessfulTx(tx);
    tx.car.create.mockRejectedValue(databaseError);

    await expect(service.create(dto, auth)).rejects.toBe(databaseError);
  });
});
