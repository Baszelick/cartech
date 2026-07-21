import { Test, TestingModule } from '@nestjs/testing';
import { ArrivalsService } from './arrivals.service';

describe('ArrivalsService', () => {
  let service: ArrivalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArrivalsService],
    }).compile();

    service = module.get<ArrivalsService>(ArrivalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
