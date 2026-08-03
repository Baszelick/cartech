import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
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
import { UserDetailsResponseDto } from './dto/user-details-response.dto';
import { UserListItemResponseDto } from './dto/user-list-item-response.dto';
import { UsersService } from './users.service';
import { UpdateUserLocationAccessDto } from './dto/update-user-location-access.dto';
import { UserLocationAccessResponseDto } from './dto/user-location-access-response.dto';
import { UserLocationAccessService } from './user-location-access.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UserRolesResponseDto } from './dto/user-roles-response.dto';
import { UserRolesService } from './user-roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import {
  PasswordResetResponseDto,
  UserCreatedResponseDto,
} from './dto/user-created-response.dto';
import { UserPersonnelService } from './user-personnel.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ActivateUserDto } from './dto/activate-user.dto';

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
    private readonly userPersonnelService: UserPersonnelService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Создать сотрудника',
    description:
      'SYSTEM_OWNER создаёт пользователя с любыми ролями; OPERATIONS_MANAGER — только с единственной ролью TECHNICIAN. Требуется минимум одна активная локация текущей компании. Временный пароль не возвращается.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({
    description: 'Сотрудник создан и обязан сменить временный пароль.',
    type: UserCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректные поля, пароль, роли, дубликаты или недоступные локации.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Роль администратора не разрешает запрошенный набор ролей.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Username уже занят в текущей компании.',
    type: HttpErrorResponseDto,
  })
  create(
    @Body() dto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userPersonnelService.create(dto, request.user);
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: 'Сбросить пароль сотрудника',
    description:
      'Устанавливает новый временный пароль, включает обязательную смену и удаляет refresh-сессии. SYSTEM_OWNER может сбросить пароль любому другому активному пользователю своей компании; OPERATIONS_MANAGER — только single-role TECHNICIAN.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Идентификатор пользователя.',
  })
  @ApiBody({ type: ResetUserPasswordDto })
  @ApiOkResponse({
    description: 'Временный пароль установлен, сессии удалены.',
    type: PasswordResetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Некорректный UUID/пароль или пользователь неактивен.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Запрещён self-reset или сброс для ролей пользователя.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Пользователь отсутствует или принадлежит другой компании.',
    type: HttpErrorResponseDto,
  })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetUserPasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userPersonnelService.resetPassword(id, dto, request.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Изменить данные сотрудника',
    description:
      'Изменяет только username, имя и фамилию. SYSTEM_OWNER управляет любым пользователем компании; OPERATIONS_MANAGER — только single-role TECHNICIAN с общей локацией.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserDetailsResponseDto })
  @ApiBadRequestResponse({ type: HttpErrorResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  @ApiConflictResponse({
    description: 'Username уже занят в текущей компании.',
    type: HttpErrorResponseDto,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userPersonnelService.update(id, dto, request.user);
  }

  @Patch(':id/deactivate')
  @ApiOperation({
    summary: 'Деактивировать сотрудника',
    description:
      'Отключает login/refresh и удаляет AuthSession, сохраняя роли, локации и историю. Self-deactivate и деактивация последнего активного SYSTEM_OWNER запрещены.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserDetailsResponseDto })
  @ApiBadRequestResponse({ type: HttpErrorResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  @ApiConflictResponse({ type: HttpErrorResponseDto })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userPersonnelService.deactivate(id, request.user);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Активировать сотрудника',
    description:
      'Активирует пользователя с новым временным паролем, включает mustChangePassword и удаляет старые AuthSession.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: ActivateUserDto })
  @ApiOkResponse({ type: UserDetailsResponseDto })
  @ApiBadRequestResponse({ type: HttpErrorResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  @ApiConflictResponse({ type: HttpErrorResponseDto })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.userPersonnelService.activate(id, dto, request.user);
  }

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
      'SYSTEM_OWNER полностью заменяет набор. OPERATIONS_MANAGER управляет только активными локациями собственного scope у single-role TECHNICIAN с общей локацией; назначения вне manager scope сохраняются. Активный пользователь не может остаться без локаций.',
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
      'Некорректный UUID, дубликаты, неактивная/недоступная локация или пустой итоговый набор активного пользователя.',
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
