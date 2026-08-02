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

@ApiTags('Дашборд')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить сводку операционного дашборда',
    description:
      'Возвращает подтверждённые операционные метрики в рамках компании и доступных локаций аутентифицированного пользователя.',
  })
  @ApiOkResponse({
    description:
      'Метрики в рамках компании и доступных локаций аутентифицированного пользователя.',
    type: DashboardResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  getDashboard(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getDashboard(request.user.userId);
  }
}
