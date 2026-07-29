import { Test } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CarsController } from './cars.controller';
import { BatteryOperationsService } from './operations/battery-operations.service';
import { CarQueryService } from './operations/car-query.service';

describe('CarsController', () => {
  const carQueries = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const batteryOperations = {
    createCheck: jest.fn(),
  };
  const request = {
    user: {
      userId: 'user-id',
      companyId: 'company-id',
      username: 'technician',
      roles: ['TECHNICIAN'],
    },
  } as AuthenticatedRequest;
  let controller: CarsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CarsController],
      providers: [
        { provide: CarQueryService, useValue: carQueries },
        { provide: BatteryOperationsService, useValue: batteryOperations },
      ],
    }).compile();
    controller = module.get(CarsController);
  });

  it('passes auth scope to the list query', async () => {
    carQueries.findAll.mockResolvedValue([]);
    await controller.findAll(request);
    expect(carQueries.findAll).toHaveBeenCalledWith('user-id');
  });

  it('passes UUID and auth scope to the details query', async () => {
    carQueries.findById.mockResolvedValue({ id: 'car-id' });
    await controller.getOne('car-id', request);
    expect(carQueries.findById).toHaveBeenCalledWith('car-id', 'user-id');
  });

  it('passes UUID, DTO and auth scope to battery operations', async () => {
    const dto = { voltage: 12.6, comment: 'Normal' };
    batteryOperations.createCheck.mockResolvedValue({ id: 'check-id' });
    await controller.createBatteryCheck('car-id', dto, request);
    expect(batteryOperations.createCheck).toHaveBeenCalledWith(
      'car-id',
      dto,
      'user-id',
    );
  });
});
