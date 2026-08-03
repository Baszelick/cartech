import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest as jestRuntime } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  const prisma = {
    company: {
      findUnique: jestRuntime.fn(),
    },
  };
  let service: CompanyService;

  beforeEach(async () => {
    jestRuntime.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CompanyService);
  });

  it('returns only the public current-company contract', async () => {
    const company = {
      id: 'company-1',
      code: 'FORSAGE',
      name: 'Форсаж',
      isActive: true,
    };
    prisma.company.findUnique.mockResolvedValue(company);

    await expect(service.getCurrent('company-1')).resolves.toEqual(company);
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
  });

  it('returns NotFound when the JWT company no longer exists', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.getCurrent('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
