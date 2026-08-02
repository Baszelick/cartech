import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';
import { ArrivalsService } from './arrivals.service';
import { CreateArrivalResponseDto } from './dto/arrival-response.dto';
import { CreateArrivalDto } from './dto/create-arrival.dto';

@ApiTags('Приёмка')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/arrivals')
export class ArrivalsController {
  constructor(private readonly arrivalsService: ArrivalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Принять прибывшие автомобили',
    description:
      'Атомарно создаёт автомобили, записи Pso со статусом PENDING и дедлайном через три календарных дня, а также события CAR_ARRIVED на доступной активной площадке. Отдельная сущность Arrival не создаётся.',
  })
  @ApiBody({ type: CreateArrivalDto })
  @ApiCreatedResponse({
    description:
      'Все автомобили, записи предпродажной подготовки и события прибытия созданы.',
    type: CreateArrivalResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Запрос не прошёл валидацию.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не аутентифицирован, не найден или неактивен.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'У пользователя нет доступа к площадке приёмки.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Активная площадка не найдена в компании пользователя.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'VIN дублируется в запросе или уже существует в компании.',
    type: HttpErrorResponseDto,
  })
  create(
    @Body() dto: CreateArrivalDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateArrivalResponseDto> {
    return this.arrivalsService.create(dto, {
      userId: request.user.userId,
      companyId: request.user.companyId,
    });
  }
}
