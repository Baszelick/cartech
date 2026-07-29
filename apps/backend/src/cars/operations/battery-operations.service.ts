import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatteryCheckResponseDto } from '../dto/battery-check-response.dto';
import { CreateBatteryCheckDto } from '../dto/create-battery-check.dto';

@Injectable()
export class BatteryOperationsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const car = await this.prisma.car.findFirst({
      where: {
        id: carId,
        companyId: user.companyId,
        ownerLocationId: {
          in: user.locationAccesses.map((access) => access.locationId),
        },
      },
      select: { id: true },
    });

    if (!car) throw new NotFoundException('Car not found');

    const batteryCheck = await this.prisma.batteryCheck.create({
      data: {
        carId,
        checkedById: userId,
        checkedOn: new Date(),
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

    return {
      ...batteryCheck,
      checkedOn: batteryCheck.checkedOn.toISOString().slice(0, 10),
      voltage:
        batteryCheck.voltage === null ? null : Number(batteryCheck.voltage),
      createdAt: batteryCheck.createdAt.toISOString(),
    };
  }
}
