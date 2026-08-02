import { Module } from '@nestjs/common';
import { BatteryScheduleService } from './battery-schedule.service';

@Module({
  providers: [BatteryScheduleService],
  exports: [BatteryScheduleService],
})
export class BatteryScheduleModule {}
