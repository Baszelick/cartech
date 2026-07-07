import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';

@Injectable()
export class CarsService {
  constructor(private prismaService: PrismaService) {}

  findAll() {
    return this.prismaService.car.findMany();
  }

  create(createCarDto: CreateCarDto) {
    return this.prismaService.car.create({
      data: createCarDto,
    });
  }
}
