import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { BatteryOperationsService } from './operations/battery-operations.service';
import { CarQueryService } from './operations/car-query.service';

@Module({
  controllers: [CarsController],
  providers: [CarQueryService, BatteryOperationsService],
})
export class CarsModule {}
