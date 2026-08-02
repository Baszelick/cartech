import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BatteryScheduleModule } from '../battery/battery-schedule.module';

@Module({
  imports: [PrismaModule, BatteryScheduleModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
