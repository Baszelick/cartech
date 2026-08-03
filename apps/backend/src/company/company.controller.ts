import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';
import { CompanyService } from './company.service';
import { CompanyResponseDto } from './dto/company-response.dto';

@ApiTags('Компания')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Получить текущую компанию',
    description:
      'Возвращает компанию из JWT context. Пользователь с обязательной сменой пароля получает PASSWORD_CHANGE_REQUIRED.',
  })
  @ApiOkResponse({
    description: 'Текущая компания.',
    type: CompanyResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Требуется аутентификация.',
    type: HttpErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Не завершена обязательная смена пароля.',
    type: HttpErrorResponseDto,
  })
  getCurrent(@Req() request: AuthenticatedRequest) {
    return this.companyService.getCurrent(request.user.companyId);
  }
}
