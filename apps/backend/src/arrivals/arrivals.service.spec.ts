import { jest as jestRuntime } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArrivalsService } from './arrivals.service';

interface MockTx {
  userLocationAccess: { findFirst: jest.Mock };
  site: { findMany: jest.Mock };
  car: { findMany: jest.Mock; create: jest.Mock };
}

function createMockTx(): MockTx {
  return {
    userLocationAccess: { findFirst: jestRuntime.fn() },
    site: { findMany: jestRuntime.fn() },
    car: { findMany: jestRuntime.fn(), create: jestRuntime.fn() },
  };
}

describe('ArrivalsService', () => {
  let service: ArrivalsService;
  let prisma: jest.Mocked<PrismaService>;
  let mockPrisma: jest.Mocked<PrismaService>;

  const mockAuth = { companyId: 'company-1', userId: 'user-1' };
  const mockLocationAccess = {
    id: 'loc-access-1',
    userId: 'user-1',
    locationId: 'loc-1',
    createdAt: new Date(),
  };
  const mockSite = { id: 'site-1', locationId: 'loc-1' };
  const mockCar = {
    id: 'car-1',
    vin: 'XW8ED41P21K123456',
    shortVin: '123456',
    brand: 'Toyota',
    model: 'Camry',
    color: null,
    companyId: 'company-1',
    createdById: 'user-1',
    ownerLocationId: 'loc-1',
    currentSiteId: 'site-1',
    arrivalSiteId: 'site-1',
    arrivedOn: new Date(),
    lifecycleStatus: 'ACTIVE' as const,
  };

  const createDto = {
    cars: [
      {
        vin: 'XW8ED41P21K123456',
        brand: 'Toyota',
        model: 'Camry',
        color: undefined,
        arrivalSiteId: 'site-1',
      },
    ],
  };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jestRuntime.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArrivalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ArrivalsService>(ArrivalsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    function givenTx(tx: MockTx): void {
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: (tx: MockTx) => unknown) => callback(tx),
      );
    }

    it('creates cars with all server-generated fields', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([mockSite]);
      tx.car.findMany.mockResolvedValue([]);
      tx.car.create.mockResolvedValue(mockCar);
      givenTx(tx);

      await service.create(createDto, mockAuth);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).toHaveBeenCalledTimes(1);

      const callData = tx.car.create.mock.calls[0][0].data;
      expect(callData).toMatchObject({
        companyId: 'company-1',
        createdById: 'user-1',
        ownerLocationId: 'loc-1',
        currentSiteId: 'site-1',
        arrivalSiteId: 'site-1',
        vin: 'XW8ED41P21K123456',
        brand: 'Toyota',
        model: 'Camry',
        color: null,
        lifecycleStatus: 'ACTIVE',
      });
      expect(callData).toHaveProperty('arrivedOn');
      expect(callData.shortVin).toBe('123456');
    });

    it('throws NotFoundException when technician has no location', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(null);
      givenTx(tx);

      await expect(service.create(createDto, mockAuth)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when site not found in company', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([]);
      givenTx(tx);

      await expect(service.create(createDto, mockAuth)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when site outside technician location', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([
        { ...mockSite, locationId: 'loc-other' },
      ]);
      givenTx(tx);

      await expect(service.create(createDto, mockAuth)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for duplicate VINs in request', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([mockSite]);
      givenTx(tx);

      const dtoWithDuplicates = {
        cars: [createDto.cars[0], { ...createDto.cars[0] }],
      };

      await expect(service.create(dtoWithDuplicates, mockAuth)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.findMany).not.toHaveBeenCalled();
      expect(tx.car.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException for existing VIN in database', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([mockSite]);
      tx.car.findMany.mockResolvedValue([{ vin: 'XW8ED41P21K123456' }]);
      givenTx(tx);

      await expect(service.create(createDto, mockAuth)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).not.toHaveBeenCalled();
    });

    it('uses company-scoped VIN check', async () => {
      const tx = createMockTx();
      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([mockSite]);
      tx.car.findMany.mockResolvedValue([]);
      tx.car.create.mockResolvedValue(mockCar);
      givenTx(tx);

      await service.create(createDto, mockAuth);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1' }),
        }),
      );
    });

    it('assigns the same arrivedOn timestamp to all cars in a batch', async () => {
      const tx = createMockTx();
      const firstSite = { id: 'site-1', locationId: 'loc-1' };
      const secondSite = { id: 'site-2', locationId: 'loc-1' };

      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([firstSite, secondSite]);
      tx.car.findMany.mockResolvedValue([]);
      tx.car.create.mockResolvedValue(mockCar);
      givenTx(tx);

      const batchDto = {
        cars: [
          {
            ...createDto.cars[0],
            vin: 'VIN00000000000001',
            arrivalSiteId: 'site-1',
          },
          {
            ...createDto.cars[0],
            vin: 'VIN00000000000002',
            arrivalSiteId: 'site-2',
          },
        ],
      };

      await service.create(batchDto, mockAuth);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).toHaveBeenCalledTimes(2);

      const firstCall = tx.car.create.mock.calls[0][0];
      const secondCall = tx.car.create.mock.calls[1][0];

      expect(firstCall.data.arrivedOn).toBe(secondCall.data.arrivedOn);
      expect(firstCall.data.vin).toBe('VIN00000000000001');
      expect(firstCall.data.arrivalSiteId).toBe('site-1');
      expect(firstCall.data.currentSiteId).toBe('site-1');
      expect(secondCall.data.vin).toBe('VIN00000000000002');
      expect(secondCall.data.arrivalSiteId).toBe('site-2');
      expect(secondCall.data.currentSiteId).toBe('site-2');
    });

    it('propagates transaction errors unchanged', async () => {
      const tx = createMockTx();
      const databaseError = new Error('DB_CONSTRAINT_FAILED');

      tx.userLocationAccess.findFirst.mockResolvedValue(mockLocationAccess);
      tx.site.findMany.mockResolvedValue([mockSite]);
      tx.car.findMany.mockResolvedValue([]);
      tx.car.create
        .mockResolvedValueOnce(mockCar)
        .mockRejectedValueOnce(databaseError);
      givenTx(tx);

      const batchDto = {
        cars: [
          { ...createDto.cars[0], vin: 'VIN00000000000001' },
          { ...createDto.cars[0], vin: 'VIN00000000000002' },
        ],
      };

      await expect(service.create(batchDto, mockAuth)).rejects.toBe(
        databaseError,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.car.create).toHaveBeenCalledTimes(2);
    });
  });
});
