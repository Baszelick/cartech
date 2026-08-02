import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CarDetailsResponseDto } from '../dto/car-details-response.dto';
import { UpdateCarIdentityDto } from '../dto/update-car-identity.dto';
import { CarQueryService } from './car-query.service';

@Injectable()
export class CarIdentityOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carQueries: CarQueryService,
  ) {}

  async update(
    carId: string,
    dto: UpdateCarIdentityDto,
    userId: string,
  ): Promise<CarDetailsResponseDto> {
    if (!this.hasOwnField(dto, 'shortVin') && !this.hasOwnField(dto, 'vin')) {
      throw new BadRequestException('Provide shortVin or vin');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: { select: { locationId: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    try {
      await this.prisma.$transaction(async (tx) => {
        const car = await tx.car.findFirst({
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

        if (this.hasOwnField(dto, 'vin') && dto.vin !== null) {
          const conflictingCar = await tx.car.findFirst({
            where: {
              companyId: user.companyId,
              vin: dto.vin,
              id: { not: carId },
            },
            select: { id: true },
          });

          if (conflictingCar) {
            throw new ConflictException(
              'Car with this VIN already exists in the company',
            );
          }
        }

        await tx.car.update({
          where: { id: carId },
          data: {
            ...(this.hasOwnField(dto, 'shortVin')
              ? { shortVin: dto.shortVin }
              : {}),
            ...(this.hasOwnField(dto, 'vin') ? { vin: dto.vin } : {}),
          },
        });
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Car with this VIN already exists in the company',
        );
      }
      throw error;
    }

    return this.carQueries.findById(carId, userId);
  }

  private hasOwnField(
    dto: UpdateCarIdentityDto,
    field: keyof UpdateCarIdentityDto,
  ): boolean {
    return Object.prototype.hasOwnProperty.call(dto, field);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
