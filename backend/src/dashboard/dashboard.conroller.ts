import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Сводка дашборда', description: 'Возвращает метрики: количество машин на складе, ожидающих ПСО, статусы батарей, выданных сегодня.' })
  @ApiOkResponse({ description: 'Метрики дашборда.' })
  getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
