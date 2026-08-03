import { Test } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

describe('CompanyController', () => {
  const companyService = {
    getCurrent: jestRuntime.fn(),
  };
  let controller: CompanyController;

  beforeEach(async () => {
    jestRuntime.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: companyService }],
    }).compile();
    controller = module.get(CompanyController);
  });

  it('passes companyId only from authenticated JWT context', async () => {
    companyService.getCurrent.mockResolvedValue({
      id: 'company-1',
      code: 'FORSAGE',
      name: 'Форсаж',
      isActive: true,
    });

    await controller.getCurrent({
      user: {
        userId: 'user-1',
        companyId: 'company-1',
        roles: ['SYSTEM_OWNER'],
        mustChangePassword: false,
      },
    } as never);

    expect(companyService.getCurrent).toHaveBeenCalledWith('company-1');
  });
});
