import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CarDetailsResponseDto } from '../dto/car-details-response.dto';
import { CarListItemResponseDto } from '../dto/car-list-item-response.dto';

@Injectable()
export class CarQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<CarListItemResponseDto[]> {
    const user = await this.findUserScope(userId);
    const cars = await this.prisma.car.findMany({
      where: {
        companyId: user.companyId,
        ownerLocationId: {
          in: user.locationAccesses.map((access) => access.locationId),
        },
      },
      select: {
        id: true,
        vin: true,
        shortVin: true,
        brand: true,
        model: true,
        color: true,
        arrivedOn: true,
        lifecycleStatus: true,
        isBlocked: true,
        ownerLocationId: true,
        currentSiteId: true,
      },
    });

    return cars.map((car) => ({
      ...car,
      arrivedOn: car.arrivedOn.toISOString().slice(0, 10),
    }));
  }

  async findById(
    carId: string,
    userId: string,
  ): Promise<CarDetailsResponseDto> {
    const user = await this.findUserScope(userId);
    const car = await this.prisma.car.findFirst({
      where: {
        id: carId,
        companyId: user.companyId,
        ownerLocationId: {
          in: user.locationAccesses.map((access) => access.locationId),
        },
      },
      select: {
        id: true,
        vin: true,
        shortVin: true,
        brand: true,
        model: true,
        color: true,
        arrivedOn: true,
        lifecycleStatus: true,
        isBlocked: true,
        blockedReason: true,
        blockedAt: true,
        ownerLocationId: true,
        currentSiteId: true,
        arrivalSiteId: true,
        archivedReason: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!car) throw new NotFoundException('Car not found');

    return {
      ...car,
      arrivedOn: car.arrivedOn.toISOString().slice(0, 10),
      blockedAt: car.blockedAt?.toISOString() ?? null,
      archivedAt: car.archivedAt?.toISOString() ?? null,
      createdAt: car.createdAt.toISOString(),
      updatedAt: car.updatedAt.toISOString(),
    };
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
}
