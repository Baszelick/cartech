import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import {
  BatteryScheduleService,
  BatteryTaskStatus,
} from '../battery/battery-schedule.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batterySchedule: BatteryScheduleService,
  ) {}

  async getDashboard(userId: string): Promise<DashboardResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: { select: { locationId: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const locationIds = user.locationAccesses.map(
      (access) => access.locationId,
    );
    const carScope = {
      companyId: user.companyId,
      ownerLocationId: { in: locationIds },
    };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [carsOnStock, needPso, issuedToday, batteryCars] = await Promise.all([
      this.prisma.car.count({
        where: {
          ...carScope,
          lifecycleStatus: CarLifecycleStatus.ACTIVE,
        },
      }),
      this.prisma.car.count({
        where: {
          ...carScope,
          lifecycleStatus: CarLifecycleStatus.ACTIVE,
          pso: { is: { status: PsoStatus.PENDING } },
        },
      }),
      this.prisma.vehicleEvent.count({
        where: {
          companyId: user.companyId,
          locationId: { in: locationIds },
          type: VehicleEventType.CAR_ISSUED,
          occurredAt: { gte: startOfToday },
        },
      }),
      this.prisma.car.findMany({
        where: {
          ...carScope,
          lifecycleStatus: CarLifecycleStatus.ACTIVE,
        },
        select: {
          arrivedOn: true,
          _count: { select: { batteryChecks: true } },
        },
      }),
    ]);

    const batteryMetrics = {
      batteryUpcoming: 0,
      batteryUrgent: 0,
      batteryOverdue: 0,
    };
    const now = new Date();

    for (const car of batteryCars) {
      const status = this.batterySchedule.getCurrentPeriod(
        car.arrivedOn,
        car._count.batteryChecks,
        now,
      ).status;

      if (status === BatteryTaskStatus.UPCOMING) {
        batteryMetrics.batteryUpcoming += 1;
      } else if (status === BatteryTaskStatus.URGENT) {
        batteryMetrics.batteryUrgent += 1;
      } else if (status === BatteryTaskStatus.OVERDUE) {
        batteryMetrics.batteryOverdue += 1;
      }
    }

    return { carsOnStock, needPso, issuedToday, ...batteryMetrics };
  }
}
