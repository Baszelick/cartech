import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';
import { BatteryCheckResponseDto } from './dto/battery-check-response.dto';
import { CarListItemResponseDto } from './dto/car-list-item-response.dto';
import { CarDetailsResponseDto } from './dto/car-details-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('Cars')
@ApiBearerAuth()
@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Список автомобилей',
    description:
      'Возвращает автомобили компании в доступных пользователю локациях.',
  })
  @ApiOkResponse({
    description: 'Список доступных автомобилей.',
    type: CarListItemResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован.' })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.carsService.findAll(request.user.userId);
  }

  @Post(':id/battery-check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Добавить проверку аккумулятора',
    description:
      'Создаёт запись проверки аккумулятора для доступного пользователю автомобиля.',
  })
  @ApiCreatedResponse({
    description: 'Проверка создана.',
    type: BatteryCheckResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован.' })
  createBatteryCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBatteryCheckDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.carsService.createBatteryCheck(
      id,
      dto,
      request.user.userId,
    );
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Задачи (PSO + батареи)', description: 'Возвращает автомобили, которым требуется ПСО или проверка аккумулятора.' })
  @ApiOkResponse({ description: 'Список задач.' })
  findTasks() {
    return this.carsService.findTasks();
  }

  @Post(':id/pso')
  @ApiOperation({ summary: 'Завершить ПСО', description: 'Переводит автомобиль в статус READY, записывает дату выполнения ПСО.' })
  @ApiOkResponse({ description: 'ПСО завершено.' })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  @ApiBadRequestResponse({ description: 'Автомобиль не в статусе ARRIVED или PSO.' })
  completePso(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.completePso(id);
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Выдать автомобиль', description: 'Переводит автомобиль в статус ISSUED, записывает дату выдачи. ПСО должно быть завершено.' })
  @ApiOkResponse({ description: 'Автомобиль выдан.' })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  @ApiBadRequestResponse({ description: 'ПСО не завершён или автомобиль уже выдан.' })
  issue(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.issueCar(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Детали автомобиля',
    description:
      'Возвращает доступный пользователю автомобиль по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Автомобиль найден.',
    type: CarDetailsResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  @ApiUnauthorizedResponse({ description: 'Пользователь не авторизован.' })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.carsService.getCarById(id, request.user.userId);
  }
}
