import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';

@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Get()
  findAll() {
    return this.carsService.findAll();
  }

  @Post()
  create(@Body() createCarDto: CreateCarDto) {
    return this.carsService.create(createCarDto);
  }

  @Post(':id/battery-check')
  createBatteryCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBatteryCheckDto,
  ) {
    return this.carsService.createBatteryCheck(id, dto);
  }

  @Get('tasks')
  findTasks() {
    return this.carsService.findTasks();
  }

  @Post(':id/pso')
  completePso(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.completePso(id);
  }

  @Post(':id/issue')
  issue(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.issueCar(id);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.getCarbyId(id);
  }
}
