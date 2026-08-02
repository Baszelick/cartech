import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleIssueResponseDto } from '../dto/vehicle-issue-response.dto';

type VehicleIssueRecord = {
  id: string;
  carId: string;
  appointmentId: string | null;
  issuedOn: Date;
  issuedById: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class VehicleIssueOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(carId: string, userId: string): Promise<VehicleIssueResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          companyId: true,
          locationAccesses: { select: { locationId: true } },
        },
      });

      if (!user) throw new UnauthorizedException('User not found');

      const car = await tx.car.findFirst({
        where: {
          id: carId,
          companyId: user.companyId,
          ownerLocationId: {
            in: user.locationAccesses.map((access) => access.locationId),
          },
        },
        select: {
          id: true,
          companyId: true,
          ownerLocationId: true,
          lifecycleStatus: true,
          isBlocked: true,
          pso: { select: { status: true } },
        },
      });

      if (!car) throw new NotFoundException('Car not found');
      if (car.lifecycleStatus !== CarLifecycleStatus.ACTIVE) {
        throw new ConflictException('Car is not active');
      }
      if (car.isBlocked) {
        throw new ConflictException('Blocked car cannot be issued');
      }
      if (car.pso?.status !== PsoStatus.COMPLETED) {
        throw new ConflictException('Completed PSO is required');
      }

      const lifecycleUpdate = await tx.car.updateMany({
        where: {
          id: car.id,
          lifecycleStatus: CarLifecycleStatus.ACTIVE,
          isBlocked: false,
        },
        data: { lifecycleStatus: CarLifecycleStatus.ISSUED },
      });

      if (lifecycleUpdate.count !== 1) {
        throw new ConflictException('Car is no longer available for issue');
      }

      const issuedOn = new Date();
      const issue = await tx.vehicleIssue.create({
        data: {
          carId: car.id,
          issuedById: userId,
          issuedOn,
        },
        select: {
          id: true,
          carId: true,
          appointmentId: true,
          issuedOn: true,
          issuedById: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.vehicleEvent.create({
        data: {
          companyId: car.companyId,
          carId: car.id,
          locationId: car.ownerLocationId,
          performedById: userId,
          type: VehicleEventType.CAR_ISSUED,
          title: 'Автомобиль выдан',
        },
      });

      return this.toResponse(issue);
    });
  }

  private toResponse(issue: VehicleIssueRecord): VehicleIssueResponseDto {
    return {
      ...issue,
      issuedOn: issue.issuedOn.toISOString().slice(0, 10),
      lifecycleStatus: CarLifecycleStatus.ISSUED,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }
}
