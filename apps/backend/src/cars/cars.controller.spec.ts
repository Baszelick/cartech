import { Test } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { CarsController } from './cars.controller';
import { BatteryOperationsService } from './operations/battery-operations.service';
import { CarQueryService } from './operations/car-query.service';
import { PsoOperationsService } from './operations/pso-operations.service';
import { VehicleIssueOperationsService } from './operations/vehicle-issue-operations.service';
import { CarTasksService } from './operations/car-tasks.service';
import { CarIdentityOperationsService } from './operations/car-identity-operations.service';

describe('CarsController', () => {
  const carQueries = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const carIdentityOperations = {
    update: jest.fn(),
  };
  const batteryOperations = {
    createCheck: jest.fn(),
  };
  const carTasks = {
    findAll: jest.fn(),
  };
  const psoOperations = {
    getCurrent: jest.fn(),
    complete: jest.fn(),
  };
  const vehicleIssueOperations = {
    issue: jest.fn(),
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
        {
          provide: CarIdentityOperationsService,
          useValue: carIdentityOperations,
        },
        { provide: CarTasksService, useValue: carTasks },
        { provide: BatteryOperationsService, useValue: batteryOperations },
        { provide: PsoOperationsService, useValue: psoOperations },
        {
          provide: VehicleIssueOperationsService,
          useValue: vehicleIssueOperations,
        },
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

  it('passes UUID, DTO and authenticated user to identity update', async () => {
    const dto = { shortVin: 'ABC123', vin: null };
    carIdentityOperations.update.mockResolvedValue({ id: 'car-id' });

    const response = await controller.updateIdentity('car-id', dto, request);

    expect(carIdentityOperations.update).toHaveBeenCalledWith(
      'car-id',
      dto,
      'user-id',
    );
    expect(response).toEqual({ id: 'car-id' });
  });

  it('passes auth scope to the tasks query', async () => {
    carTasks.findAll.mockResolvedValue([]);

    await controller.getTasks(request);

    expect(carTasks.findAll).toHaveBeenCalledWith('user-id');
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

  it('passes UUID and authenticated user to the PSO state operation', async () => {
    psoOperations.getCurrent.mockResolvedValue({ id: 'pso-id' });

    const response = await controller.getPso('car-id', request);

    expect(psoOperations.getCurrent).toHaveBeenCalledWith('car-id', 'user-id');
    expect(response).toEqual({ id: 'pso-id' });
  });

  it('passes UUID and authenticated user to PSO completion', async () => {
    psoOperations.complete.mockResolvedValue({
      id: 'pso-id',
      status: 'COMPLETED',
    });

    const response = await controller.completePso('car-id', request);

    expect(psoOperations.complete).toHaveBeenCalledWith('car-id', 'user-id');
    expect(response).toEqual({ id: 'pso-id', status: 'COMPLETED' });
  });

  it('passes UUID and authenticated user to vehicle issue', async () => {
    vehicleIssueOperations.issue.mockResolvedValue({
      id: 'issue-id',
      lifecycleStatus: 'ISSUED',
    });

    const response = await controller.issue('car-id', request);

    expect(vehicleIssueOperations.issue).toHaveBeenCalledWith(
      'car-id',
      'user-id',
    );
    expect(response).toEqual({
      id: 'issue-id',
      lifecycleStatus: 'ISSUED',
    });
  });
});
