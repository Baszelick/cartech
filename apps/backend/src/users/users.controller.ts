import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { UserDetailsResponseDto } from './dto/user-details-response.dto';
import { UserListItemResponseDto } from './dto/user-list-item-response.dto';
import { UsersService } from './users.service';
import { UpdateUserLocationAccessDto } from './dto/update-user-location-access.dto';
import { UserLocationAccessResponseDto } from './dto/user-location-access-response.dto';
import { UserLocationAccessService } from './user-location-access.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UserRolesResponseDto } from './dto/user-roles-response.dto';
import { UserRolesService } from './user-roles.service';

@ApiTags('Пользователи')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userLocationAccessService: UserLocationAccessService,
    private readonly userRolesService: UserRolesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Получить пользователей компании',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Возвращает безопасные данные пользователей только из компании, указанной в JWT.',
  })
  @ApiOkResponse({
    description:
      'Пользователи текущей компании, стабильно отсортированные по фамилии, имени и username.',
    type: UserListItemResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает просмотр пользователей.',
    type: HttpErrorResponseDto,
  })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.usersService.findAll(request.user.companyId);
  }

  @Get(':id/location-access')
  @ApiOperation({
    summary: 'Получить доступы пользователя к локациям',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Возвращает назначенные локации пользователя только из текущей компании.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  @ApiOkResponse({
    description: 'Текущий набор доступов пользователя к локациям.',
    type: UserLocationAccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID пользователя.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает просмотр доступов.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  getLocationAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userLocationAccessService.getForUser(
      id,
      request.user.companyId,
    );
  }

  @Put(':id/location-access')
  @ApiOperation({
    summary: 'Заменить доступы пользователя к локациям',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Полностью заменяет набор доступов локациями текущей компании. SYSTEM_OWNER может менять собственные доступы; OPERATIONS_MANAGER — только доступы других пользователей. Дубликаты UUID отклоняются.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  @ApiBody({ type: UpdateUserLocationAccessDto })
  @ApiOkResponse({
    description: 'Новый полный набор доступов пользователя к локациям.',
    type: UserLocationAccessResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректный UUID, дубликаты locationIds или недоступная компании локация.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'Недостаточная роль либо OPERATIONS_MANAGER изменяет собственные доступы.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  replaceLocationAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserLocationAccessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userLocationAccessService.replaceForUser(id, dto, request.user);
  }

  @Get(':id/roles')
  @ApiOperation({
    summary: 'Получить роли пользователя',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Возвращает стабильно отсортированные роли пользователя только из текущей компании.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  @ApiOkResponse({
    description: 'Текущий набор ролей пользователя.',
    type: UserRolesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID пользователя.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает просмотр ролей.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  getRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userRolesService.getForUser(id, request.user.companyId);
  }

  @Put(':id/roles')
  @ApiOperation({
    summary: 'Полностью заменить роли пользователя',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. SYSTEM_OWNER может менять любые роли, включая собственные, если в компании остаётся другой SYSTEM_OWNER. OPERATIONS_MANAGER не может менять собственные роли либо назначать и снимать SYSTEM_OWNER. После изменения удаляются все refresh-сессии пользователя.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  @ApiBody({ type: UpdateUserRolesDto })
  @ApiOkResponse({
    description: 'Новый полный, стабильно отсортированный набор ролей.',
    type: UserRolesResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректный UUID, пустой массив, дубликаты или неизвестное значение роли.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      'OPERATIONS_MANAGER изменяет собственные роли либо назначает/снимает SYSTEM_OWNER.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Операция снимает роль у последнего SYSTEM_OWNER текущей компании.',
    type: HttpErrorResponseDto,
  })
  replaceRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userRolesService.replaceForUser(id, dto, request.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить пользователя компании',
    description:
      'Доступно ролям SYSTEM_OWNER и OPERATIONS_MANAGER. Пользователь другой компании скрывается как отсутствующий.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  @ApiOkResponse({
    description: 'Безопасные данные пользователя текущей компании.',
    type: UserDetailsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID пользователя.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль пользователя не разрешает просмотр пользователей.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.findById(id, request.user.companyId);
  }
}
