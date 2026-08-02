import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  CarLifecycleStatus,
  PsoStatus,
  VehicleEventType,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import {
  ArrivedCarResponseDto,
  CreateArrivalResponseDto,
} from './dto/arrival-response.dto';

export interface ArrivalAuthContext {
  userId: string;
  companyId: string;
}

const ARRIVED_CAR_SELECT = {
  id: true,
  vin: true,
  shortVin: true,
  brand: true,
  model: true,
  color: true,
  arrivedOn: true,
  lifecycleStatus: true,
  ownerLocationId: true,
  currentSiteId: true,
  arrivalSiteId: true,
  createdAt: true,
} satisfies Prisma.CarSelect;

type ArrivedCarRecord = Prisma.CarGetPayload<{
  select: typeof ARRIVED_CAR_SELECT;
}>;

@Injectable()
export class ArrivalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateArrivalDto,
    auth: ArrivalAuthContext,
  ): Promise<CreateArrivalResponseDto> {
    this.validateDuplicateVins(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const requestedVins = dto.cars.flatMap(({ vin }) => (vin ? [vin] : []));
        const requestedShortVins = [
          ...new Set(dto.cars.map(({ shortVin }) => shortVin)),
        ];
        const [user, site, existingCars, existingShortVinCars] =
          await Promise.all([
            tx.user.findFirst({
              where: {
                id: auth.userId,
                companyId: auth.companyId,
                isActive: true,
              },
              select: {
                locationAccesses: {
                  select: {
                    locationId: true,
                  },
                },
              },
            }),
            tx.site.findFirst({
              where: {
                id: dto.arrivalSiteId,
                isActive: true,
                location: {
                  companyId: auth.companyId,
                  isActive: true,
                },
              },
              select: {
                id: true,
                locationId: true,
              },
            }),
            tx.car.findMany({
              where: {
                companyId: auth.companyId,
                vin: { in: requestedVins },
              },
              select: {
                vin: true,
              },
            }),
            tx.car.findMany({
              where: {
                companyId: auth.companyId,
                shortVin: { in: requestedShortVins },
              },
              select: {
                shortVin: true,
              },
            }),
          ]);

        if (!user) {
          throw new UnauthorizedException('Active user not found');
        }

        if (!site) {
          throw new NotFoundException('Arrival site not found');
        }

        const hasLocationAccess = user.locationAccesses.some(
          ({ locationId }) => locationId === site.locationId,
        );

        if (!hasLocationAccess) {
          throw new ForbiddenException(
            'Arrival site is outside user location scope',
          );
        }

        if (existingCars.length > 0) {
          throw new ConflictException(
            `Cars with VINs already exist: ${existingCars
              .map(({ vin }) => vin)
              .join(', ')}`,
          );
        }

        const arrivedOn = new Date(dto.arrivedOn);
        const psoDeadlineOn = this.calculatePsoDeadline(arrivedOn);
        const createdCars: ArrivedCarRecord[] = [];

        for (const carDto of dto.cars) {
          const car = await tx.car.create({
            data: {
              companyId: auth.companyId,
              ownerLocationId: site.locationId,
              currentSiteId: site.id,
              arrivalSiteId: site.id,
              createdById: auth.userId,
              vin: carDto.vin,
              shortVin: carDto.shortVin,
              brand: carDto.brand,
              model: carDto.model,
              color: carDto.color ?? null,
              arrivedOn,
              lifecycleStatus: CarLifecycleStatus.ACTIVE,
            },
            select: ARRIVED_CAR_SELECT,
          });

          await tx.pso.create({
            data: {
              carId: car.id,
              status: PsoStatus.PENDING,
              deadlineOn: psoDeadlineOn,
              completedOn: null,
              completedById: null,
            },
          });

          await tx.vehicleEvent.create({
            data: {
              companyId: auth.companyId,
              carId: car.id,
              locationId: site.locationId,
              performedById: auth.userId,
              type: VehicleEventType.CAR_ARRIVED,
              title: 'Автомобиль принят',
            },
          });

          createdCars.push(car);
        }

        return {
          count: createdCars.length,
          cars: createdCars.map((car) =>
            this.toResponse(
              car,
              this.hasShortVinDuplicate(
                car.shortVin,
                dto,
                existingShortVinCars,
              ),
            ),
          ),
        };
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Car with this VIN already exists');
      }

      throw error;
    }
  }

  private validateDuplicateVins(dto: CreateArrivalDto): void {
    const vins = dto.cars.flatMap(({ vin }) => (vin ? [vin] : []));

    if (new Set(vins).size !== vins.length) {
      throw new ConflictException('Duplicate VINs in arrival request');
    }
  }

  private hasShortVinDuplicate(
    shortVin: string,
    dto: CreateArrivalDto,
    existingCars: Array<{ shortVin: string }>,
  ): boolean {
    const batchCount = dto.cars.filter(
      (car) => car.shortVin === shortVin,
    ).length;

    return (
      batchCount > 1 || existingCars.some((car) => car.shortVin === shortVin)
    );
  }

  private calculatePsoDeadline(arrivedOn: Date): Date {
    const deadlineOn = new Date(arrivedOn.getTime());
    deadlineOn.setUTCDate(deadlineOn.getUTCDate() + 3);
    return deadlineOn;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private toResponse(
    car: ArrivedCarRecord,
    hasShortVinDuplicate: boolean,
  ): ArrivedCarResponseDto {
    return {
      ...car,
      hasShortVinDuplicate,
      arrivedOn: car.arrivedOn.toISOString().slice(0, 10),
      lifecycleStatus: 'ACTIVE',
      createdAt: car.createdAt.toISOString(),
    };
  }
}
