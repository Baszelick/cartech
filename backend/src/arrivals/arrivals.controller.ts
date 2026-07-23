import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { ArrivalsService } from './arrivals.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Arrivals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('arrivals')
export class ArrivalsController {
  constructor(private readonly arrivalsService: ArrivalsService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех поступлений', description: 'Возвращает все поступления автовозов с автомобилями.' })
  @ApiOkResponse({ description: 'Список поступлений.' })
  findAll() {
    return this.arrivalsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Поступление по ID', description: 'Возвращает детали поступления с автомобилями.' })
  @ApiOkResponse({ description: 'Поступление найдено.' })
  @ApiNotFoundResponse({ description: 'Поступление не найдено.' })
  findOne(@Param('id') id: string) {
    return this.arrivalsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать поступление', description: 'Создаёт новое поступление автовоза с автомобилями. Валидирует VIN, площадки, бренды, модели и цвета.' })
  @ApiCreatedResponse({ description: 'Поступление создано.' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации (дубликат VIN, неверный бренд для площадки и т.д.).' })
  create(@Body() dto: CreateArrivalDto) {
    return this.arrivalsService.create(dto);
  }
}
