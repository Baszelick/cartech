import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
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

@ApiTags('Cars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(
    private readonly carQueries: CarQueryService,
    private readonly batteryOperations: BatteryOperationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List accessible cars',
    description:
      'Returns cars in the authenticated user company and owner locations.',
  })
  @ApiOkResponse({
    description: 'Cars in the authenticated user company and locations.',
    type: CarListItemResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
    type: HttpErrorResponseDto,
  })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.carQueries.findAll(request.user.userId);
  }

  @Post(':id/battery-check')
  @ApiOperation({
    summary: 'Record a completed battery check',
    description:
      'Records a BatteryCheck fact for a car available in the authenticated user scope.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
  })
  @ApiBody({ type: CreateBatteryCheckDto })
  @ApiCreatedResponse({
    description: 'Battery check recorded.',
    type: BatteryCheckResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid UUID or request body.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Car not found or unavailable.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
    type: HttpErrorResponseDto,
  })
  createBatteryCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBatteryCheckDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.batteryOperations.createCheck(id, dto, request.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get accessible car details',
    description:
      'Returns one car when it belongs to the authenticated user company and owner locations.',
  })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
  })
  @ApiOkResponse({
    description: 'Car details.',
    type: CarDetailsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid car UUID.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Car not found or unavailable.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
    type: HttpErrorResponseDto,
  })
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.carQueries.findById(id, request.user.userId);
  }
}
