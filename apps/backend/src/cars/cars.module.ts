import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { BatteryOperationsService } from './operations/battery-operations.service';
import { CarQueryService } from './operations/car-query.service';
import { PsoOperationsService } from './operations/pso-operations.service';
import { VehicleIssueOperationsService } from './operations/vehicle-issue-operations.service';
import { BatteryScheduleModule } from '../battery/battery-schedule.module';
import { CarTasksService } from './operations/car-tasks.service';
import { CarIdentityOperationsService } from './operations/car-identity-operations.service';

@Module({
  imports: [BatteryScheduleModule],
  controllers: [CarsController],
  providers: [
    CarQueryService,
    CarIdentityOperationsService,
    CarTasksService,
    BatteryOperationsService,
    PsoOperationsService,
    VehicleIssueOperationsService,
  ],
})
export class CarsModule {}
