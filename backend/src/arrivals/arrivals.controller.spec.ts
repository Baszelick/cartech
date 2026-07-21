import { Test, TestingModule } from '@nestjs/testing';
import { ArrivalsController } from './arrivals.controller';

describe('ArrivalsController', () => {
  let controller: ArrivalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArrivalsController],
    }).compile();

    controller = module.get<ArrivalsController>(ArrivalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
