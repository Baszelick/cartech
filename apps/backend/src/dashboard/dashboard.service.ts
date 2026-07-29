import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

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

    const [carsOnStock, needPso, issuedToday] = await Promise.all([
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
    ]);

    return { carsOnStock, needPso, issuedToday };
  }
}
