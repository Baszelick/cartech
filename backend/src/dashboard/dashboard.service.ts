import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CarStatus } from '@prisma/client';
import { BatteryStatus } from '../cars/enums/battery-status.enum';
import { getBatteryStatus, getDaysLeft } from '../cars/utils/battery.util';

@Injectable()
export class DashboardService {
  constructor(private prismaService: PrismaService) {}

  async getDashboard() {
    const today = new Date();

    const [carsOnStock, needPso, carsForBattery, issuedToday] =
      await Promise.all([
        this.prismaService.car.count({
          where: {
            status: { not: CarStatus.ISSUED },
          },
        }),

        this.prismaService.car.count({
          where: {
            status: { not: CarStatus.ISSUED },
            psoCompletedAt: null,
          },
        }),

        this.prismaService.car.findMany({
          where: {
            status: { not: CarStatus.ISSUED },
            nextBatteryCheckAt: {
              not: null,
            },
          },
          select: {
            nextBatteryCheckAt: true,
          },
        }),

        this.prismaService.car.count({
          where: {
            issuedAt: {
              gte: new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
              ),
            },
          },
        }),
      ]);

    const batteryStats = {
      warning: 0,
      critical: 0,
      overdue: 0,
    };

    carsForBattery.forEach((car) => {
      if (!car.nextBatteryCheckAt) return;

      const daysLeft = getDaysLeft(car.nextBatteryCheckAt);

      const status = getBatteryStatus(daysLeft);

      switch (status) {
        case BatteryStatus.WARNING:
          batteryStats.warning++;
          break;

        case BatteryStatus.CRITICAL:
          batteryStats.critical++;
          break;

        case BatteryStatus.OVERDUE:
          batteryStats.overdue++;
          break;
      }
    });

    return {
      carsOnStock,
      needPso,
      battery: batteryStats,
      issuedToday,
    };
  }
}
