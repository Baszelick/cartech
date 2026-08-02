import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  BatteryScheduleService,
  BatteryTaskStatus,
} from '../../battery/battery-schedule.service';
import { CarLifecycleStatus, PsoStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CarTaskResponseDto,
  CarTaskStatus,
  CarTaskType,
} from '../dto/car-task-response.dto';

@Injectable()
export class CarTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batterySchedule: BatteryScheduleService,
  ) {}

  async findAll(userId: string): Promise<CarTaskResponseDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: { select: { locationId: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const cars = await this.prisma.car.findMany({
      where: {
        companyId: user.companyId,
        ownerLocationId: {
          in: user.locationAccesses.map((access) => access.locationId),
        },
        lifecycleStatus: CarLifecycleStatus.ACTIVE,
      },
      select: {
        id: true,
        vin: true,
        arrivedOn: true,
        pso: { select: { status: true, deadlineOn: true } },
        _count: { select: { batteryChecks: true } },
      },
      orderBy: { id: 'asc' },
    });

    const now = new Date();
    const tasks = cars.flatMap((car): CarTaskResponseDto[] => {
      const carTasks: CarTaskResponseDto[] = [];

      if (car.pso?.status === PsoStatus.PENDING) {
        carTasks.push({
          carId: car.id,
          vin: car.vin,
          type: CarTaskType.PSO,
          status: CarTaskStatus.PENDING,
          dueOn: this.toDateString(car.pso.deadlineOn),
        });
      }

      const period = this.batterySchedule.getCurrentPeriod(
        car.arrivedOn,
        car._count.batteryChecks,
        now,
      );
      if (period.status !== null) {
        carTasks.push({
          carId: car.id,
          vin: car.vin,
          type: CarTaskType.BATTERY,
          status: this.toCarTaskStatus(period.status),
          dueOn: this.toDateString(period.dueOn),
          periodNumber: period.periodNumber,
        });
      }

      return carTasks;
    });

    return tasks.sort(
      (left, right) =>
        left.dueOn.localeCompare(right.dueOn) ||
        left.carId.localeCompare(right.carId) ||
        left.type.localeCompare(right.type),
    );
  }

  private toCarTaskStatus(status: BatteryTaskStatus): CarTaskStatus {
    const statusMap: Record<BatteryTaskStatus, CarTaskStatus> = {
      [BatteryTaskStatus.UPCOMING]: CarTaskStatus.UPCOMING,
      [BatteryTaskStatus.URGENT]: CarTaskStatus.URGENT,
      [BatteryTaskStatus.OVERDUE]: CarTaskStatus.OVERDUE,
    };

    return statusMap[status];
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
