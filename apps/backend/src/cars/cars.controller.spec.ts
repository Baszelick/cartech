import { Test, TestingModule } from '@nestjs/testing';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

describe('CarsController', () => {
  let controller: CarsController;
  const carsService = {
    findAll: jest.fn(),
    getCarById: jest.fn(),
    createBatteryCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarsController],
      providers: [
        {
          provide: CarsService,
          useValue: carsService,
        },
      ],
    }).compile();

    controller = module.get<CarsController>(CarsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('passes the authenticated user id to the service', async () => {
      const request = {
        user: {
          userId: 'user-id',
          username: 'technician',
          role: 'TECHNICIAN',
        },
      } as AuthenticatedRequest;
      const cars = [{ id: 'car-id' }];

      carsService.findAll.mockResolvedValue(cars);

      await expect(controller.findAll(request)).resolves.toBe(cars);
      expect(carsService.findAll).toHaveBeenCalledWith('user-id');
    });
  });

  describe('getOne', () => {
    it('passes the car and authenticated user ids to the service', async () => {
      const request = {
        user: {
          userId: 'user-id',
          username: 'technician',
          role: 'TECHNICIAN',
        },
      } as AuthenticatedRequest;
      const car = { id: 'car-id' };

      carsService.getCarById.mockResolvedValue(car);

      await expect(controller.getOne('car-id', request)).resolves.toBe(car);
      expect(carsService.getCarById).toHaveBeenCalledWith('car-id', 'user-id');
    });
  });

  describe('createBatteryCheck', () => {
    it('passes the car, DTO and authenticated user ids to the service', async () => {
      const request = {
        user: {
          userId: 'user-id',
          username: 'technician',
          role: 'TECHNICIAN',
        },
      } as AuthenticatedRequest;
      const dto = { voltage: 12.6, comment: 'Норма' };
      const batteryCheck = { id: 'battery-check-id' };

      carsService.createBatteryCheck.mockResolvedValue(batteryCheck);

      await expect(
        controller.createBatteryCheck('car-id', dto, request),
      ).resolves.toBe(batteryCheck);
      expect(carsService.createBatteryCheck).toHaveBeenCalledWith(
        'car-id',
        dto,
        'user-id',
      );
    });
  });
});
