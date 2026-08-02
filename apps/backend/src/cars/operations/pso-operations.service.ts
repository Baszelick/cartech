import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PsoStatus, VehicleEventType } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PsoResponseDto } from '../dto/pso-response.dto';

const PSO_SELECT = {
  id: true,
  carId: true,
  status: true,
  deadlineOn: true,
  completedOn: true,
  completedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PsoRecord = {
  id: string;
  carId: string;
  status: PsoStatus;
  deadlineOn: Date;
  completedOn: Date | null;
  completedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PsoOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(carId: string, userId: string): Promise<PsoResponseDto> {
    const user = await this.findUserScope(userId);
    const car = await this.prisma.car.findFirst({
      where: this.carScope(carId, user),
      select: { pso: { select: PSO_SELECT } },
    });

    if (!car) throw new NotFoundException('Car not found');
    if (!car.pso) throw new NotFoundException('PSO not found');

    return this.toResponse(car.pso);
  }

  async complete(carId: string, userId: string): Promise<PsoResponseDto> {
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
        where: this.carScope(carId, user),
        select: {
          id: true,
          companyId: true,
          ownerLocationId: true,
          lifecycleStatus: true,
          pso: { select: { id: true, status: true } },
        },
      });

      if (!car) throw new NotFoundException('Car not found');
      if (!car.pso) throw new NotFoundException('PSO not found');
      if (car.pso.status === PsoStatus.COMPLETED) {
        throw new ConflictException('PSO already completed');
      }

      const completedOn = new Date();
      const updateResult = await tx.pso.updateMany({
        where: { id: car.pso.id, status: PsoStatus.PENDING },
        data: {
          status: PsoStatus.COMPLETED,
          completedOn,
          completedById: userId,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException('PSO already completed');
      }

      await tx.vehicleEvent.create({
        data: {
          companyId: car.companyId,
          carId: car.id,
          locationId: car.ownerLocationId,
          performedById: userId,
          type: VehicleEventType.PSO_COMPLETED,
          title: 'Предпродажная подготовка завершена',
        },
      });

      const pso = await tx.pso.findUnique({
        where: { id: car.pso.id },
        select: PSO_SELECT,
      });

      if (!pso) throw new NotFoundException('PSO not found');
      return this.toResponse(pso);
    });
  }

  private async findUserScope(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: { select: { locationId: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private carScope(
    carId: string,
    user: {
      companyId: string;
      locationAccesses: { locationId: string }[];
    },
  ) {
    return {
      id: carId,
      companyId: user.companyId,
      ownerLocationId: {
        in: user.locationAccesses.map((access) => access.locationId),
      },
    };
  }

  private toResponse(pso: PsoRecord): PsoResponseDto {
    return {
      ...pso,
      deadlineOn: pso.deadlineOn.toISOString().slice(0, 10),
      completedOn: pso.completedOn?.toISOString().slice(0, 10) ?? null,
      createdAt: pso.createdAt.toISOString(),
      updatedAt: pso.updatedAt.toISOString(),
    };
  }
}
