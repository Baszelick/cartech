import { jest as jestRuntime } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { ArrivalsController } from './arrivals.controller';
import { ArrivalsService } from './arrivals.service';

describe('ArrivalsController', () => {
  let controller: ArrivalsController;
  const create: jest.Mock = jestRuntime.fn();

  beforeEach(async () => {
    jestRuntime.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArrivalsController],
      providers: [
        {
          provide: ArrivalsService,
          useValue: { create },
        },
      ],
    }).compile();

    controller = module.get<ArrivalsController>(ArrivalsController);
  });

  it('passes DTO and authenticated scope to the service', async () => {
    const dto = {
      arrivalSiteId: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
      arrivedOn: '2026-07-29',
      cars: [
        {
          vin: 'XW8ED41P21K123456',
          shortVin: '123456',
          brand: 'Toyota',
          model: 'Camry',
        },
      ],
    };
    const request = {
      user: {
        userId: 'user-1',
        companyId: 'company-1',
        username: 'admin',
        roles: ['SYSTEM_OWNER'],
      },
    } as AuthenticatedRequest;
    const response = { count: 1, cars: [] };
    create.mockResolvedValue(response);

    await expect(controller.create(dto, request)).resolves.toBe(response);
    expect(create).toHaveBeenCalledWith(dto, {
      userId: 'user-1',
      companyId: 'company-1',
    });
  });
});
