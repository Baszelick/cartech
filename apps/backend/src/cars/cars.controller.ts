import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';

@ApiTags('Cars')
@ApiBearerAuth()
@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Get()
  @ApiOperation({ summary: 'Список всех автомобилей', description: 'Возвращает все автомобили с брендом, моделью, цветом и площадкой.' })
  @ApiOkResponse({ description: 'Список автомобилей.' })
  findAll() {
    return this.carsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать автомобиль', description: 'Создаёт новый автомобиль. nextBatteryCheckAt устанавливается +30 дней от сегодня.' })
  @ApiCreatedResponse({ description: 'Автомобиль создан.' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации.' })
  create(@Body() createCarDto: CreateCarDto) {
    return this.carsService.create(createCarDto);
  }

  @Post(':id/battery-check')
  @ApiOperation({ summary: 'Добавить проверку аккумулятора', description: 'Создаёт запись проверки аккумулятора и автоматически пересчитывает nextBatteryCheckAt (+30 дней).' })
  @ApiCreatedResponse({ description: 'Проверка создана.' })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  createBatteryCheck(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBatteryCheckDto,
  ) {
    return this.carsService.createBatteryCheck(id, dto);
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
  @ApiOperation({ summary: 'Детали автомобиля', description: 'Возвращает автомобиль с брендом, моделью, цветом, площадкой и историей проверок аккумулятора.' })
  @ApiOkResponse({ description: 'Автомобиль найден.' })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден.' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.getCarbyId(id);
  }
}
