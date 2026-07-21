import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';
import { Car, CarStatus } from '@prisma/client';
import { getBatteryStatus, getDaysLeft } from './utils/battery.util';

@Injectable()
export class CarsService {
  constructor(private prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.car.findMany();
  }

  create(createCarDto: CreateCarDto) {
    const nextBatteryCheckAt = new Date(createCarDto.arrivalDate);
    nextBatteryCheckAt.setDate(nextBatteryCheckAt.getDate() + 30);
    return this.prismaService.car.create({
      data: { ...createCarDto, nextBatteryCheckAt: nextBatteryCheckAt },
    });
  }

  getCarbyId(carId: number) {
    return this.prismaService.car.findUnique({
      where: {
        id: carId,
      },
      include: {
        batteryChecks: {
          orderBy: {
            checkedAt: 'desc',
          },
        },
      },
    });
  }

  async createBatteryCheck(carId: number, dto: CreateBatteryCheckDto) {
    const car = await this.prismaService.car.findUnique({
      where: {
        id: carId,
      },
    });

    if (!car) {
      throw new NotFoundException('Car not found');
    }

    const lastBatteryCheckAt = new Date();

    const nextBatteryCheckAt = new Date(lastBatteryCheckAt);
    nextBatteryCheckAt.setDate(nextBatteryCheckAt.getDate() + 30);

    return this.prismaService.$transaction(async (tx) => {
      const batteryCheck = await tx.batteryCheck.create({
        data: {
          ...dto,
          carId,
        },
      });

      await tx.car.update({
        where: {
          id: carId,
        },
        data: {
          batteryLastCheckAt: lastBatteryCheckAt,
          nextBatteryCheckAt,
        },
      });

      return batteryCheck;
    });
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

    return await this.prismaService.car.update({
      where: {
        id: carId,
      },
      data: {
        psoCompletedAt: today,
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
    if (car.status === CarStatus.ISSUED)
      throw new BadRequestException('Car is already issued');
    if (car.psoCompletedAt === null)
      throw new BadRequestException('Car pso not complete');

    return await this.prismaService.car.update({
      where: {
        id: carId,
      },
      data: {
        status: CarStatus.ISSUED,
        issuedAt: today,
      },
    });
  }
}
