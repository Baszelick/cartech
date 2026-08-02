import {
  Controller,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { SiteResponseDto } from './dto/site-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { LocationsService } from './locations.service';

@ApiTags('Локации и площадки')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Создать локацию',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Создаёт локацию в компании из JWT; companyId и служебные поля из тела запроса не принимаются.',
  })
  @ApiBody({ type: CreateLocationDto })
  @ApiCreatedResponse({
    description: 'Локация создана.',
    type: LocationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Тело запроса не прошло валидацию.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление локациями.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Код локации уже существует в текущей компании.',
    type: HttpErrorResponseDto,
  })
  create(
    @Body() dto: CreateLocationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.create(dto, request.user.companyId);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Деактивировать локацию',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Устанавливает isActive=false только при отсутствии автомобилей внутри локации. Sites и UserLocationAccess сохраняются.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор локации.',
  })
  @ApiOkResponse({
    description: 'Локация деактивирована.',
    type: LocationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID локации.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление локациями.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Локация отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'В локации находятся автомобили.',
    type: HttpErrorResponseDto,
  })
  deactivateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.deactivateLocation(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Изменить локацию',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Изменяет разрешённые поля активной или неактивной локации текущей компании.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор локации.',
  })
  @ApiBody({ type: UpdateLocationDto })
  @ApiOkResponse({
    description: 'Локация обновлена.',
    type: LocationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID или тело запроса.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление локациями.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Локация отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Новый код уже используется локацией текущей компании.',
    type: HttpErrorResponseDto,
  })
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.updateLocation(
      id,
      dto,
      request.user.companyId,
    );
  }

  @Post(':locationId/sites')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Создать площадку',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Создаёт площадку в активной или неактивной локации текущей компании.',
  })
  @ApiParam({
    name: 'locationId',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор родительской локации.',
  })
  @ApiBody({ type: CreateSiteDto })
  @ApiCreatedResponse({
    description: 'Площадка создана.',
    type: SiteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID или тело запроса.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление площадками.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Локация отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Название площадки уже используется в этой локации.',
    type: HttpErrorResponseDto,
  })
  createSite(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateSiteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.createSite(
      locationId,
      dto,
      request.user.companyId,
    );
  }

  @Patch(':locationId/sites/:siteId/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Деактивировать площадку',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Устанавливает isActive=false только при отсутствии автомобилей на площадке.',
  })
  @ApiParam({
    name: 'locationId',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
  })
  @ApiParam({
    name: 'siteId',
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
  })
  @ApiOkResponse({
    description: 'Площадка деактивирована.',
    type: SiteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление площадками.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Локация или площадка отсутствует, принадлежит другой компании либо площадка относится к другой локации.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'На площадке находятся автомобили.',
    type: HttpErrorResponseDto,
  })
  deactivateSite(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.deactivateSite(
      locationId,
      siteId,
      request.user.companyId,
    );
  }

  @Patch(':locationId/sites/:siteId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
  @ApiOperation({
    summary: 'Изменить площадку',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Изменяет разрешённые поля активной или неактивной площадки без перемещения между локациями.',
  })
  @ApiParam({
    name: 'locationId',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
  })
  @ApiParam({
    name: 'siteId',
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
  })
  @ApiBody({ type: UpdateSiteDto })
  @ApiOkResponse({
    description: 'Площадка обновлена.',
    type: SiteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID или тело запроса.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает управление площадками.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'Локация или площадка отсутствует, принадлежит другой компании либо площадка относится к другой локации.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Название площадки уже используется в этой локации.',
    type: HttpErrorResponseDto,
  })
  updateSite(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Body() dto: UpdateSiteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.updateSite(
      locationId,
      siteId,
      dto,
      request.user.companyId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Получить доступные локации',
    description:
      'Возвращает только локации компании из JWT, назначенные текущему пользователю через UserLocationAccess.',
  })
  @ApiOkResponse({
    description: 'Доступные пользователю локации, отсортированные по названию.',
    type: LocationResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.locationsService.findAll({
      userId: request.user.userId,
      companyId: request.user.companyId,
    });
  }

  @Get(':locationId/sites')
  @ApiOperation({
    summary: 'Получить площадки доступной локации',
    description:
      'Проверяет компанию из JWT и доступ пользователя к локации, затем возвращает её площадки. Пустой список является успешным ответом.',
  })
  @ApiParam({
    name: 'locationId',
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор локации.',
  })
  @ApiOkResponse({
    description: 'Площадки локации, отсортированные по названию.',
    type: SiteResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID локации.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Локация отсутствует или недоступна пользователю.',
    type: HttpErrorResponseDto,
  })
  findSites(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.locationsService.findSites(locationId, {
      userId: request.user.userId,
      companyId: request.user.companyId,
    });
  }
}
