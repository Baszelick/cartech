import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import { CarModel, Color, Prisma } from '@prisma/client';

type SiteWithBrands = Prisma.SiteGetPayload<{
  include: { brands: true };
}>;

interface ArrivalValidationContext {
  existingCars: { vin: string }[];
  sitesMap: Map<number, SiteWithBrands>;
  modelsMap: Map<number, CarModel>;
  colorsMap: Map<number, Color>;
}

const ARRIVAL_INCLUDE = {
  cars: {
    include: {
      model: {
        include: { brand: true },
      },
      color: true,
      site: true,
    },
  },
} satisfies Prisma.ArrivalInclude;

@Injectable()
export class ArrivalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.arrival.findMany({
      include: ARRIVAL_INCLUDE,
      orderBy: {
        arrivalDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const arrival = await this.prisma.arrival.findUnique({
      where: { id },
      include: ARRIVAL_INCLUDE,
    });
    if (!arrival) {
      throw new NotFoundException(`Arrival with id ${id} not found`);
    }
    return arrival;
  }

  async create(dto: CreateArrivalDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.validate(dto, tx);

      const arrival = await this.createArrival(tx, dto);

      await this.createCars(tx, arrival.id, dto.cars, dto.arrivalDate);

      return this.getArrival(tx, arrival.id);
    });
  }

  private async validate(
    dto: CreateArrivalDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.validateDuplicateVins(dto.cars);

    const context = await this.loadValidationContext(dto.cars, tx);

    this.validateExistingVins(context.existingCars);
    this.validateSites(dto.cars, context.sitesMap);
    this.validateModels(dto.cars, context.modelsMap);
    this.validateColors(dto.cars, context.colorsMap);
    this.validateBrandPermissions(dto.cars, context.sitesMap);
  }

  private validateDuplicateVins(cars: CreateArrivalDto['cars']): void {
    const vins = cars.map((c) => c.vin);
    const uniqueVins = new Set(vins);
    if (uniqueVins.size !== vins.length) {
      throw new BadRequestException('Duplicate VINs found in arrival request');
    }
  }

  private async loadValidationContext(
    cars: CreateArrivalDto['cars'],
    tx: Prisma.TransactionClient,
  ): Promise<ArrivalValidationContext> {
    const vins = cars.map((c) => c.vin);
    const siteIds = Array.from(new Set(cars.map((c) => c.siteId)));
    const modelIds = Array.from(new Set(cars.map((c) => c.modelId)));
    const colorIds = Array.from(new Set(cars.map((c) => c.colorId)));

    const [existingCars, sites, models, colors] = await Promise.all([
      tx.car.findMany({
        where: { vin: { in: vins } },
        select: { vin: true },
      }),
      tx.site.findMany({
        where: { id: { in: siteIds } },
        include: { brands: true },
      }),
      tx.carModel.findMany({
        where: { id: { in: modelIds } },
      }),
      tx.color.findMany({
        where: { id: { in: colorIds } },
      }),
    ]);

    return {
      existingCars,
      sitesMap: new Map(sites.map((s) => [s.id, s])),
      modelsMap: new Map(models.map((m) => [m.id, m])),
      colorsMap: new Map(colors.map((c) => [c.id, c])),
    };
  }

  private validateExistingVins(existingCars: { vin: string }[]): void {
    if (existingCars.length > 0) {
      throw new BadRequestException(
        `Cars with VINs already exist: ${existingCars.map((c) => c.vin).join(', ')}`,
      );
    }
  }

  private validateSites(
    cars: CreateArrivalDto['cars'],
    sitesMap: Map<number, SiteWithBrands>,
  ): void {
    for (const carDto of cars) {
      if (!sitesMap.has(carDto.siteId)) {
        throw new NotFoundException(`Site with id ${carDto.siteId} not found`);
      }
    }
  }

  private validateModels(
    cars: CreateArrivalDto['cars'],
    modelsMap: Map<number, CarModel>,
  ): void {
    for (const carDto of cars) {
      const model = modelsMap.get(carDto.modelId);
      if (!model) {
        throw new NotFoundException(
          `CarModel with id ${carDto.modelId} not found`,
        );
      }
      if (model.brandId !== carDto.brandId) {
        throw new BadRequestException(
          `Model id ${carDto.modelId} does not belong to brand id ${carDto.brandId}`,
        );
      }
    }
  }

  private validateColors(
    cars: CreateArrivalDto['cars'],
    colorsMap: Map<number, Color>,
  ): void {
    for (const carDto of cars) {
      if (!colorsMap.has(carDto.colorId)) {
        throw new NotFoundException(
          `Color with id ${carDto.colorId} not found`,
        );
      }
    }
  }

  private validateBrandPermissions(
    cars: CreateArrivalDto['cars'],
    sitesMap: Map<number, SiteWithBrands>,
  ): void {
    for (const carDto of cars) {
      const site = sitesMap.get(carDto.siteId);
      if (site) {
        const brandAllowed = site.brands.some(
          (sb) => sb.brandId === carDto.brandId,
        );
        if (!brandAllowed) {
          throw new BadRequestException(
            `Brand id ${carDto.brandId} is not allowed on site id ${carDto.siteId}`,
          );
        }
      }
    }
  }

  private async createArrival(
    tx: Prisma.TransactionClient,
    dto: CreateArrivalDto,
  ) {
    return tx.arrival.create({
      data: {
        truckNumber: dto.truckNumber,
        arrivalDate: new Date(dto.arrivalDate),
        comment: dto.comment,
      },
    });
  }

  private async createCars(
    tx: Prisma.TransactionClient,
    arrivalId: string,
    carsDto: CreateArrivalDto['cars'],
    arrivalDateStr: string,
  ): Promise<void> {
    const arrivalDate = new Date(arrivalDateStr);
    const nextBatteryCheckAt = new Date(arrivalDate);
    nextBatteryCheckAt.setDate(nextBatteryCheckAt.getDate() + 30);

    const carsData = carsDto.map((carDto) => ({
      vin: carDto.vin,
      siteId: carDto.siteId,
      modelId: carDto.modelId,
      colorId: carDto.colorId,
      comment: carDto.comment,
      arrivalId,
      nextBatteryCheckAt,
    }));

    await tx.car.createMany({
      data: carsData,
    });
  }

  private async getArrival(tx: Prisma.TransactionClient, arrivalId: string) {
    const arrival = await tx.arrival.findUnique({
      where: { id: arrivalId },
      include: ARRIVAL_INCLUDE,
    });
    if (!arrival) {
      throw new NotFoundException(`Arrival with id ${arrivalId} not found`);
    }
    return arrival;
  }
}
