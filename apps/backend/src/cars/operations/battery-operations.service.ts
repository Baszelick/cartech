import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BatteryScheduleService } from '../../battery/battery-schedule.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BatteryCheckResponseDto } from '../dto/battery-check-response.dto';
import { CreateBatteryCheckDto } from '../dto/create-battery-check.dto';

@Injectable()
export class BatteryOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batterySchedule: BatteryScheduleService,
  ) {}

  async createCheck(
    carId: string,
    dto: CreateBatteryCheckDto,
    userId: string,
  ): Promise<BatteryCheckResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: { select: { locationId: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const checkedOn = new Date();
    const batteryCheck = await this.prisma.$transaction(
      async (tx) => {
        const car = await tx.car.findFirst({
          where: {
            id: carId,
            companyId: user.companyId,
            ownerLocationId: {
              in: user.locationAccesses.map((access) => access.locationId),
            },
          },
          select: { id: true, arrivedOn: true },
        });

        if (!car) throw new NotFoundException('Car not found');

        const completedChecks = await tx.batteryCheck.count({
          where: { carId },
        });
        const period = this.batterySchedule.getCurrentPeriod(
          car.arrivedOn,
          completedChecks,
          checkedOn,
        );

        if (!period.canComplete) {
          throw new ConflictException(
            `Battery check period ${period.periodNumber} opens on ${this.toDateString(
              this.subtractDays(period.dueOn, 3),
            )}`,
          );
        }

        return tx.batteryCheck.create({
          data: {
            carId,
            checkedById: userId,
            checkedOn,
            voltage: dto.voltage,
            comment: dto.comment,
          },
          select: {
            id: true,
            carId: true,
            checkedById: true,
            checkedOn: true,
            voltage: true,
            comment: true,
            createdAt: true,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    return {
      ...batteryCheck,
      checkedOn: batteryCheck.checkedOn.toISOString().slice(0, 10),
      voltage:
        batteryCheck.voltage === null ? null : Number(batteryCheck.voltage),
      createdAt: batteryCheck.createdAt.toISOString(),
    };
  }

  private subtractDays(value: Date, days: number): Date {
    const result = new Date(value);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }

  private toDateString(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
