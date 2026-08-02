import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BatteryCheckResponseDto } from './dto/battery-check-response.dto';
import { CarDetailsResponseDto } from './dto/car-details-response.dto';
import { CarListItemResponseDto } from './dto/car-list-item-response.dto';
import { CreateBatteryCheckDto } from './dto/create-battery-check.dto';
import { BatteryOperationsService } from './operations/battery-operations.service';
import { CarQueryService } from './operations/car-query.service';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';
import { PsoResponseDto } from './dto/pso-response.dto';
import { PsoOperationsService } from './operations/pso-operations.service';
import { VehicleIssueResponseDto } from './dto/vehicle-issue-response.dto';
import { VehicleIssueOperationsService } from './operations/vehicle-issue-operations.service';
import { CarTaskResponseDto } from './dto/car-task-response.dto';
import { CarTasksService } from './operations/car-tasks.service';
import { UpdateCarIdentityDto } from './dto/update-car-identity.dto';
import { CarIdentityOperationsService } from './operations/car-identity-operations.service';

@ApiTags('Автомобили')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(
    private readonly carQueries: CarQueryService,
    private readonly carIdentityOperations: CarIdentityOperationsService,
    private readonly carTasks: CarTasksService,
    private readonly batteryOperations: BatteryOperationsService,
    private readonly psoOperations: PsoOperationsService,
    private readonly vehicleIssueOperations: VehicleIssueOperationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Получить список доступных автомобилей',
    description:
      'Возвращает автомобили компании аутентифицированного пользователя в доступных ему локациях-владельцах.',
  })
  @ApiOkResponse({
    description:
      'Автомобили компании аутентифицированного пользователя в доступных локациях.',
    type: CarListItemResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.carQueries.findAll(request.user.userId);
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'Получить текущие задачи по автомобилям',
    description:
      'Возвращает незавершённые PSO и текущий календарный Battery-период со статусом UPCOMING, URGENT или OVERDUE для доступных активных автомобилей.',
  })
  @ApiOkResponse({
    description: 'Текущие задачи в рамках компании и доступных локаций.',
    type: CarTaskResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  getTasks(@Req() request: AuthenticatedRequest) {
    return this.carTasks.findAll(request.user.userId);
  }

  @Post(':id/battery-check')
  @ApiOperation({
    summary: 'Зафиксировать выполненную проверку аккумулятора',
    description:
      'Фиксирует факт BatteryCheck для автомобиля, доступного аутентифицированному пользователю.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
  })
  @ApiBody({ type: CreateBatteryCheckDto })
  @ApiCreatedResponse({
    description: 'Проверка аккумулятора зафиксирована.',
    type: BatteryCheckResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID или тело запроса.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Автомобиль не найден или недоступен.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Проверка выполняется раньше разрешённого окна: более чем за 3 календарных дня до плановой даты.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  createBatteryCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBatteryCheckDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.batteryOperations.createCheck(id, dto, request.user.userId);
  }

  @Get(':id/pso')
  @ApiOperation({
    summary: 'Получить состояние предпродажной подготовки',
    description:
      'Возвращает текущую запись Pso для автомобиля в рамках компании и доступных локаций аутентифицированного пользователя.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля.',
  })
  @ApiOkResponse({
    description: 'Текущее состояние предпродажной подготовки.',
    type: PsoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID автомобиля.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Автомобиль недоступен пользователю или запись предпродажной подготовки отсутствует.',
    type: HttpErrorResponseDto,
  })
  getPso(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.psoOperations.getCurrent(id, request.user.userId);
  }

  @Post(':id/pso/complete')
  @ApiOperation({
    summary: 'Завершить предпродажную подготовку',
    description:
      'Переводит существующую Pso из PENDING в COMPLETED, фиксирует серверную дату, пользователя из JWT и событие PSO_COMPLETED. Lifecycle автомобиля не изменяется.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля.',
  })
  @ApiOkResponse({
    description: 'Предпродажная подготовка завершена.',
    type: PsoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID автомобиля.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Автомобиль недоступен пользователю или запись предпродажной подготовки отсутствует.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Предпродажная подготовка уже завершена.',
    type: HttpErrorResponseDto,
  })
  completePso(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.psoOperations.complete(id, request.user.userId);
  }

  @Post(':id/issue')
  @ApiOperation({
    summary: 'Выдать автомобиль',
    description:
      'Создаёт VehicleIssue, переводит автомобиль из ACTIVE в ISSUED и фиксирует событие CAR_ISSUED. Выдача доступна только для незаблокированного автомобиля с завершённой PSO в рамках компании и доступных локаций пользователя.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля.',
  })
  @ApiCreatedResponse({
    description: 'Автомобиль успешно выдан.',
    type: VehicleIssueResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID автомобиля.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Автомобиль не найден или недоступен пользователю.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Автомобиль уже выдан, неактивен, заблокирован или его PSO не завершена.',
    type: HttpErrorResponseDto,
  })
  issue(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.vehicleIssueOperations.issue(id, request.user.userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Изменить идентификаторы автомобиля',
    description:
      'Изменяет только shortVin и/или полный VIN. Значения нормализуются в uppercase. shortVin обязателен и может совпадать; полный VIN необязателен и уникален внутри компании.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля.',
  })
  @ApiBody({ type: UpdateCarIdentityDto })
  @ApiOkResponse({
    description:
      'Идентификаторы обновлены; response содержит warning-флаг совпадения shortVin.',
    type: CarDetailsResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректный UUID, пустой request или нарушение VIN/shortVin contract.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Автомобиль не найден или недоступен.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Полный VIN уже используется другой машиной этой компании.',
    type: HttpErrorResponseDto,
  })
  updateIdentity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarIdentityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.carIdentityOperations.update(id, dto, request.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить данные доступного автомобиля',
    description:
      'Возвращает автомобиль, если он принадлежит компании аутентифицированного пользователя и доступной ему локации-владельцу.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
  })
  @ApiOkResponse({
    description: 'Подробные данные автомобиля.',
    type: CarDetailsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID автомобиля.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Автомобиль не найден или недоступен.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.carQueries.findById(id, request.user.userId);
  }
}
