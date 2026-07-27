import { Test, TestingModule } from '@nestjs/testing';
import { ArrivalsService } from './arrivals.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateArrivalDto } from './dto/create-arrival.dto';

describe('ArrivalsService', () => {
  let service: ArrivalsService;
  let prismaService: {
    arrival: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    const prismaServiceMock = {
      arrival: {
        findUnique: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: unknown) => unknown) =>
          callback({}),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArrivalsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ArrivalsService>(ArrivalsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findOne() returns found arrival', async () => {
    const mockArrival = { id: '1', truckNumber: 'AB123C' };
    prismaService.arrival.findUnique.mockResolvedValue(mockArrival);

    const result = await service.findOne('1');
    expect(result).toEqual(mockArrival);
    expect(prismaService.arrival.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      include: expect.any(Object) as unknown,
    });
  });

  it('findOne() throws NotFoundException if arrival not found', async () => {
    prismaService.arrival.findUnique.mockResolvedValue(null);

    await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
  });

  it('create() throws BadRequestException if duplicate VINs in DTO', async () => {
    const dto = {
      truckNumber: 'AB123C',
      arrivalDate: '2026-07-23T00:00:00.000Z',
      cars: [
        { vin: 'VIN1', siteId: 1, modelId: 1, colorId: 1, brandId: 1 },
        { vin: 'VIN1', siteId: 1, modelId: 1, colorId: 1, brandId: 1 },
      ],
    } as CreateArrivalDto;

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });
});
