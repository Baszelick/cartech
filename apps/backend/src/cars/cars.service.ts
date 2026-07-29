import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';
import {
  Car,
  CarLifecycleStatus,
} from '../../generated/prisma/client';
import { getBatteryStatus, getDaysLeft } from './utils/battery.util';
import { CarListItemResponseDto } from './dto/car-list-item-response.dto';
import { CarDetailsResponseDto } from './dto/car-details-response.dto';
import { BatteryCheckResponseDto } from './dto/battery-check-response.dto';

@Injectable()
export class CarsService {
  constructor(private prismaService: PrismaService) {}

  async findAll(userId: string): Promise<CarListItemResponseDto[]> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: {
          select: {
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const cars = await this.prismaService.car.findMany({
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

  async getCarById(
    carId: string,
    userId: string,
  ): Promise<CarDetailsResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: {
          select: {
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const car = await this.prismaService.car.findFirst({
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

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    return {
      ...car,
      arrivedOn: car.arrivedOn.toISOString().slice(0, 10),
      blockedAt: car.blockedAt?.toISOString() ?? null,
      archivedAt: car.archivedAt?.toISOString() ?? null,
      createdAt: car.createdAt.toISOString(),
      updatedAt: car.updatedAt.toISOString(),
    };
  }

  async createBatteryCheck(
    carId: string,
    dto: CreateBatteryCheckDto,
    userId: string,
  ): Promise<BatteryCheckResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        locationAccesses: {
          select: {
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const car = await this.prismaService.car.findFirst({
      where: {
        id: carId,
        companyId: user.companyId,
        ownerLocationId: {
          in: user.locationAccesses.map((access) => access.locationId),
        },
      },
      select: { id: true },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    const batteryCheck = await this.prismaService.batteryCheck.create({
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

  private mapTask(car: Car) {
    const daysLeft = car.nextBatteryCheckAt
      ? getDaysLeft(car.nextBatteryCheckAt)
      : null;

    return {
      ...car,
      daysLeft,
      batteryStatus: getBatteryStatus(daysLeft!),
      needPso: car.psoCompletedAt === null,
    };
  }

  async findTasks() {
    const today = new Date();

    const cars = await this.prismaService.car.findMany({
      where: {
        status: {
          not: CarLifecycleStatus.ISSUED,
        },
        OR: [
          {
            psoCompletedAt: null,
          },
          {
            nextBatteryCheckAt: {
              lte: today,
            },
          },
        ],
      },
      include: {
        model: {
          include: { brand: true },
        },
        color: true,
        site: true,
      },
    });

    return cars.map((car: Car) => this.mapTask(car));
  }

  async completePso(carId: number) {
    const today = new Date();

    const car = await this.prismaService.car.findUnique({
      where: {
        id: carId,
      },
    });

    if (!car) throw new NotFoundException('Car not found');
    if (
      car.status !== CarLifecycleStatus.ARRIVED &&
      car.status !== CarLifecycleStatus.PSO
    ) {
      throw new BadRequestException(
        'Car is not in a valid status for PSO completion',
      );
    }

    return await this.prismaService.car.update({
      where: {
        id: carId,
      },
      data: {
        psoCompletedAt: today,
        status: CarLifecycleStatus.READY,
      },
    });
  }

  async issueCar(carId: number) {
    const today = new Date();
    const car = await this.prismaService.car.findUnique({
      where: {
        id: carId,
      },
    });
    if (!car) throw new NotFoundException('Car not found');
    if (car.status === CarLifecycleStatus.ISSUED)
      throw new BadRequestException('Car is already issued');
    if (car.psoCompletedAt === null)
      throw new BadRequestException('Car pso not complete');

    return await this.prismaService.car.update({
      where: {
        id: carId,
      },
      data: {
        status: CarLifecycleStatus.ISSUED,
        issuedAt: today,
      },
    });
  }
}
