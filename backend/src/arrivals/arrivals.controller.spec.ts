import { Test, TestingModule } from '@nestjs/testing';
import { ArrivalsController } from './arrivals.controller';
import { ArrivalsService } from './arrivals.service';

describe('ArrivalsController', () => {
  let controller: ArrivalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArrivalsController],
      providers: [
        {
          provide: ArrivalsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ArrivalsController>(ArrivalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
