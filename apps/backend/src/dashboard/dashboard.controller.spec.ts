import { Test } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  const dashboardService = { getDashboard: jest.fn() };
  let controller: DashboardController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: dashboardService }],
    }).compile();
    controller = module.get(DashboardController);
  });

  it('passes the authenticated user id to the service', async () => {
    const request = {
      user: {
        userId: 'user-id',
        companyId: 'company-id',
        username: 'operator',
        roles: ['VIEWER'],
      },
    } as AuthenticatedRequest;
    const response = { carsOnStock: 12, needPso: 4, issuedToday: 3 };
    dashboardService.getDashboard.mockResolvedValue(response);

    await expect(controller.getDashboard(request)).resolves.toBe(response);
    expect(dashboardService.getDashboard).toHaveBeenCalledWith('user-id');
  });
});
