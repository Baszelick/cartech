import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CarsService } from './cars.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CarsService', () => {
  let service: CarsService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    car: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    batteryCheck: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns cars from the user company and accessible locations', async () => {
      const arrivedOn = new Date('2026-07-29T00:00:00.000Z');

      prisma.user.findUnique.mockResolvedValue({
        companyId: 'company-id',
        locationAccesses: [
          { locationId: 'location-1' },
          { locationId: 'location-2' },
        ],
      });
      prisma.car.findMany.mockResolvedValue([
        {
          id: 'car-id',
          vin: 'XW8ED41P21K123456',
          shortVin: '123456',
          brand: 'Jetour',
          model: 'X70 Plus',
          color: 'Белый',
          arrivedOn,
          lifecycleStatus: 'ACTIVE',
          isBlocked: false,
          ownerLocationId: 'location-1',
          currentSiteId: 'site-id',
        },
      ]);

      await expect(service.findAll('user-id')).resolves.toEqual([
        {
          id: 'car-id',
          vin: 'XW8ED41P21K123456',
          shortVin: '123456',
          brand: 'Jetour',
          model: 'X70 Plus',
          color: 'Белый',
          arrivedOn: '2026-07-29',
          lifecycleStatus: 'ACTIVE',
          isBlocked: false,
          ownerLocationId: 'location-1',
          currentSiteId: 'site-id',
        },
      ]);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: {
          companyId: true,
          locationAccesses: {
            select: {
              locationId: true,
            },
          },
        },
      });
      expect(prisma.car.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-id',
          ownerLocationId: {
            in: ['location-1', 'location-2'],
          },
        },
        select: {
          id: true,
          vin: true,
          shortVin: true,
          brand: true,
          model: true,
          color: true,
          arrivedOn: true,
          lifecycleStatus: true,
          isBlocked: true,
          ownerLocationId: true,
          currentSiteId: true,
        },
      });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll('user-id')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.car.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getCarById', () => {
    it('returns a car from the user company and accessible locations', async () => {
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
        currentSiteId: 'current-site-id',
        arrivalSiteId: 'arrival-site-id',
        archivedReason: null,
        archivedAt: null,
        createdAt: new Date('2026-07-29T09:30:00.000Z'),
        updatedAt: new Date('2026-07-29T10:15:00.000Z'),
      });

      await expect(
        service.getCarById('car-id', 'user-id'),
      ).resolves.toEqual({
        id: 'car-id',
        vin: 'XW8ED41P21K123456',
        shortVin: '123456',
        brand: 'Jetour',
        model: 'X70 Plus',
        color: null,
        arrivedOn: '2026-07-29',
        lifecycleStatus: 'ACTIVE',
        isBlocked: false,
        blockedReason: null,
        blockedAt: null,
        ownerLocationId: 'location-id',
        currentSiteId: 'current-site-id',
        arrivalSiteId: 'arrival-site-id',
        archivedReason: null,
        archivedAt: null,
        createdAt: '2026-07-29T09:30:00.000Z',
        updatedAt: '2026-07-29T10:15:00.000Z',
      });
      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'car-id',
          companyId: 'company-id',
          ownerLocationId: {
            in: ['location-id'],
          },
        },
        select: {
          id: true,
          vin: true,
          shortVin: true,
          brand: true,
          model: true,
          color: true,
          arrivedOn: true,
          lifecycleStatus: true,
          isBlocked: true,
          blockedReason: true,
          blockedAt: true,
          ownerLocationId: true,
          currentSiteId: true,
          arrivalSiteId: true,
          archivedReason: true,
          archivedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('throws NotFoundException when the car is unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({
        companyId: 'company-id',
        locationAccesses: [{ locationId: 'location-id' }],
      });
      prisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.getCarById('car-id', 'user-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createBatteryCheck', () => {
    it('creates a check for a car in an accessible location', async () => {
      prisma.user.findUnique.mockResolvedValue({
        companyId: 'company-id',
        locationAccesses: [{ locationId: 'location-id' }],
      });
      prisma.car.findFirst.mockResolvedValue({ id: 'car-id' });
      prisma.batteryCheck.create.mockResolvedValue({
        id: 'battery-check-id',
        carId: 'car-id',
        checkedById: 'user-id',
        checkedOn: new Date('2026-07-29T00:00:00.000Z'),
        voltage: 12.6,
        comment: 'Норма',
        createdAt: new Date('2026-07-29T10:15:00.000Z'),
      });

      await expect(
        service.createBatteryCheck(
          'car-id',
          { voltage: 12.6, comment: 'Норма' },
          'user-id',
        ),
      ).resolves.toEqual({
        id: 'battery-check-id',
        carId: 'car-id',
        checkedById: 'user-id',
        checkedOn: '2026-07-29',
        voltage: 12.6,
        comment: 'Норма',
        createdAt: '2026-07-29T10:15:00.000Z',
      });

      expect(prisma.car.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'car-id',
          companyId: 'company-id',
          ownerLocationId: {
            in: ['location-id'],
          },
        },
        select: { id: true },
      });
      expect(prisma.batteryCheck.create).toHaveBeenCalledWith({
        data: {
          carId: 'car-id',
          checkedById: 'user-id',
          checkedOn: expect.any(Date),
          voltage: 12.6,
          comment: 'Норма',
        },
        select: {
          id: true,
          carId: true,
          checkedById: true,
          checkedOn: true,
          voltage: true,
          comment: true,
          createdAt: true,
        },
      });
    });

    it('does not create a check for an unavailable car', async () => {
      prisma.user.findUnique.mockResolvedValue({
        companyId: 'company-id',
        locationAccesses: [{ locationId: 'location-id' }],
      });
      prisma.car.findFirst.mockResolvedValue(null);

      await expect(
        service.createBatteryCheck('car-id', {}, 'user-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.batteryCheck.create).not.toHaveBeenCalled();
    });
  });
});
