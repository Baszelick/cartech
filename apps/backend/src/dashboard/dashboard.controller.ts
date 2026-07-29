import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the operational dashboard summary',
    description:
      'Returns confirmed operational metrics within the authenticated user company and locations.',
  })
  @ApiOkResponse({
    description:
      'Metrics scoped to the authenticated user company and locations.',
    type: DashboardResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
    type: HttpErrorResponseDto,
  })
  getDashboard(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getDashboard(request.user.userId);
  }
}
