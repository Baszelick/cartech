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

@ApiTags('Arrivals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations/arrivals')
export class ArrivalsController {
  constructor(private readonly arrivalsService: ArrivalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Accept arriving cars',
    description:
      'Atomically creates cars and CAR_ARRIVED events at an accessible active site. No Arrival entity is created.',
  })
  @ApiBody({ type: CreateArrivalDto })
  @ApiCreatedResponse({
    description: 'All cars and arrival events were created.',
    type: CreateArrivalResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'User is unauthenticated, missing, or inactive.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'User has no access to the arrival site location.',
    type: HttpErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Active site was not found in the user company.',
    type: HttpErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'VIN is duplicated in the request or company.',
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
